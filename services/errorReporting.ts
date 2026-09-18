import { Alert } from "react-native";

declare const ErrorUtils: {
  getGlobalHandler(): (error: Error, isFatal?: boolean) => void;
  setGlobalHandler(handler: (error: Error, isFatal?: boolean) => void): void;
};

let installed = false;

/**
 * Temporary diagnostic net: in a release build a fatal JS error normally
 * terminates the app instantly with no on-screen trace (no Metro, no
 * redbox). This intercepts it, shows the message on-screen so it can be
 * read/screenshotted, and deliberately does NOT call through to the
 * default handler — so the app stays alive long enough to actually see it.
 * Remove once the root cause behind a silent crash is found.
 */
export function installGlobalErrorHandler(): void {
  if (installed || typeof ErrorUtils === "undefined") return;
  installed = true;

  const previousHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error("[global error]", isFatal ? "FATAL" : "non-fatal", error);
    Alert.alert(
      isFatal ? "Fatalt fel (fångat)" : "Fel (fångat)",
      `${error.name}: ${error.message}\n\n${error.stack ?? ""}`.slice(0, 1800),
      [{ text: "OK" }]
    );
    if (!isFatal) {
      previousHandler(error, isFatal);
    }
  });
}
