#import <Capacitor/Capacitor.h>

CAP_PLUGIN(IAPPlugin, "IAPPlugin",
    CAP_PLUGIN_METHOD(requestPurchase, CAPPluginReturnPromise);
)
