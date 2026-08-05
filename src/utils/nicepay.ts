export type NicepayCheckout = {
  type: "nicepay-js";
  clientId: string;
  method: "card";
  orderId: string;
  amount: number;
  goodsName: string;
  returnUrl: string;
};

type NicepayError = { errorMsg?: string };

declare global {
  interface Window {
    AUTHNICE?: {
      requestPay: (options: NicepayCheckout & { fnError: (error: NicepayError) => void }) => void;
    };
  }
}

let sdkPromise: Promise<void> | null = null;

export const preloadNicepayCheckout = () => {
  if (window.AUTHNICE) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://pay.nicepay.co.kr/v1/js/";
    script.async = true;
    script.onload = () => (window.AUTHNICE ? resolve() : reject(new Error("NICEPAY_SDK_MISSING")));
    script.onerror = () => reject(new Error("NICEPAY_SDK_LOAD_FAILED"));
    document.head.appendChild(script);
  });
  return sdkPromise;
};

export function openNicepayCheckout(
  checkout: NicepayCheckout,
  onError: (message: string) => void,
) {
  if (!window.AUTHNICE) {
    throw new Error("NICEPAY_SDK_NOT_READY");
  }
  window.AUTHNICE!.requestPay({
    ...checkout,
    fnError: (error) => onError(error.errorMsg || "결제창을 열지 못했어요."),
  });
}
