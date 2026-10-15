import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UIKit
import GoogleSignIn

class AppDelegate: RCTAppDelegate {
    override func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
         // Initialize ReactNativeNotifications
        RNNotifications.startMonitorNotifications()

        moduleName = "StorefrontApp"
        dependencyProvider = RCTAppDependencyProvider()

        // You can add your custom initial props in the dictionary below.
        // They will be passed down to the ViewController used by React Native.
        initialProps = [:]

        return super.application(application, didFinishLaunchingWithOptions: launchOptions)
    }

    @objc override func application(
        _ application: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
         // Let Google Sign-In handle the URL
        if GIDSignIn.sharedInstance.handle(url) {
            return true
        }

        // Otherwise fallback to RCTLinkingManager for other deep links
        return RCTLinkingManager.application(application, open: url, options: options)
    }

    override func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
      RNNotifications.didRegisterForRemoteNotifications(withDeviceToken: deviceToken)
    }

    override func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        RNNotifications.didFailToRegisterForRemoteNotificationsWithError(error)
    }

    override func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        RNNotifications.didReceiveBackgroundNotification(userInfo, withCompletionHandler: completionHandler)
    }

    override func sourceURL(for _: RCTBridge) -> URL? {
        bundleURL()
    }

    override func bundleURL() -> URL? {
        #if DEBUG
            return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
        #else
            return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
        #endif
    }

    override func customize(_ rootView: RCTRootView!) {
        super.customize(rootView)
        RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView)
    }
}

@main
class MainApp {
    static func main() {
        UIApplicationMain(
            CommandLine.argc,
            CommandLine.unsafeArgv,
            nil,
            NSStringFromClass(AppDelegate.self)
        )
    }
}
