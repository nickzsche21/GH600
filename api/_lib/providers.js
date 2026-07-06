import { checkoutUrl } from "./plans.js";

const providers = {
  paddle: {
    createCheckout(plan) {
      const redirectUrl = checkoutUrl(plan);
      return redirectUrl ? { redirectUrl } : { manual: true };
    }
  },
  wise: {
    createCheckout() {
      return { manual: true };
    }
  },
  manual: {
    createCheckout() {
      return { manual: true };
    }
  }
};

export function createCheckout(plan) {
  const provider = providers[plan.provider] || providers.manual;
  return provider.createCheckout(plan);
}
