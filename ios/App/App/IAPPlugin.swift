import Foundation
import Capacitor
import StoreKit

/// Capacitor plugin that handles Apple In-App Purchases via StoreKit 2.
/// Injects `window.MASAYiOS` bridge into the web view for compatibility
/// with the web frontend's IAP detection and purchase flow.
@objc(IAPPlugin)
class IAPPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "IAPPlugin"
    let jsName = "IAPPlugin"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestPurchase", returnType: CAPPluginReturnPromise)
    ]

    private var products: [Product] = []
    private let productId = "com.makeasongaboutyou.song"

    override func load() {
        // Inject MASAYiOS bridge into the web view
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let webView = self.bridge?.webView else { return }

            let js = """
            window.MASAYiOS = {
                isNativeApp: true,
                requestPurchase: function(productId) {
                    window.Capacitor.Plugins.IAPPlugin.requestPurchase({ productId: productId });
                }
            };
            console.log('[MASAYiOS] Native IAP bridge injected');
            """

            let script = WKUserScript(source: js, injectionTime: .atDocumentStart, forMainFrameOnly: true)
            webView.configuration.userContentController.addUserScript(script)

            // Also evaluate immediately in case page already loaded
            webView.evaluateJavaScript(js, completionHandler: nil)
        }

        // Start listening for transactions
        Task {
            for await result in Transaction.updates {
                if case .verified(let transaction) = result {
                    await transaction.finish()
                }
            }
        }

        // Pre-load products
        Task {
            do {
                products = try await Product.products(for: [productId])
                print("[IAPPlugin] Loaded \(products.count) product(s)")
            } catch {
                print("[IAPPlugin] Failed to load products: \(error)")
            }
        }
    }

    /// Called from web via Capacitor bridge or MASAYiOS.requestPurchase()
    @objc func requestPurchase(_ call: CAPPluginCall) {
        let requestedId = call.getString("productId") ?? productId

        Task {
            do {
                // Load product if not already cached
                if products.isEmpty {
                    products = try await Product.products(for: [requestedId])
                }

                guard let product = products.first(where: { $0.id == requestedId }) else {
                    self.sendPurchaseCallback(success: false, error: "Product not found")
                    call.reject("Product not found")
                    return
                }

                let result = try await product.purchase()

                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        await transaction.finish()

                        let transactionId = String(transaction.id)

                        // Send success callback to web
                        self.sendPurchaseCallback(
                            success: true,
                            transactionId: transactionId,
                            receiptData: transactionId  // StoreKit 2 uses JWS, transaction ID suffices
                        )

                        call.resolve([
                            "success": true,
                            "transactionId": transactionId
                        ])

                    case .unverified(_, let error):
                        self.sendPurchaseCallback(success: false, error: "Verification failed: \(error.localizedDescription)")
                        call.reject("Verification failed")
                    }

                case .pending:
                    self.sendPurchaseCallback(success: false, error: "Purchase is pending approval")
                    call.reject("Purchase pending")

                case .userCancelled:
                    self.sendPurchaseCallback(success: false, error: "Purchase cancelled")
                    call.reject("User cancelled")

                @unknown default:
                    self.sendPurchaseCallback(success: false, error: "Unknown purchase result")
                    call.reject("Unknown result")
                }
            } catch {
                self.sendPurchaseCallback(success: false, error: error.localizedDescription)
                call.reject(error.localizedDescription)
            }
        }
    }

    /// Sends purchase result back to the web layer via __masayPurchaseCallback
    private func sendPurchaseCallback(success: Bool, transactionId: String? = nil, receiptData: String? = nil, error: String? = nil) {
        DispatchQueue.main.async { [weak self] in
            guard let webView = self?.bridge?.webView else { return }

            var jsObj = "{ success: \(success)"
            if let txnId = transactionId {
                jsObj += ", transactionId: '\(txnId)'"
            }
            if let receipt = receiptData {
                jsObj += ", receiptData: '\(receipt)'"
            }
            if let err = error {
                jsObj += ", error: '\(err.replacingOccurrences(of: "'", with: "\\'"))'"
            }
            jsObj += " }"

            let js = """
            if (typeof window.__masayPurchaseCallback === 'function') {
                window.__masayPurchaseCallback(\(jsObj));
            }
            """
            webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }
}
