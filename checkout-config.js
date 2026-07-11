// Emergency live checkout override.
// Founding and Pro should sell today via hosted Gumroad links; Team/Cram still
// use the existing manual follow-up flow.
(() => {
  const CHECKOUT_URLS = {
    founder: "https://nikhilite46.gumroad.com/l/ewvqwg",
    founding: "https://nikhilite46.gumroad.com/l/ewvqwg",
    founding_access: "https://nikhilite46.gumroad.com/l/ewvqwg",
    pro: "https://nikhilite46.gumroad.com/l/fbylmr"
  };

  window.GH600_CHECKOUT = {
    ...CHECKOUT_URLS,
    team: "",
    cram: ""
  };

  window.GH600_DIRECT_CHECKOUT_URLS = CHECKOUT_URLS;

  function normalizedPlan(plan) {
    return plan === "founding" || plan === "founding_access" ? "founder" : plan;
  }

  function saveCheckoutEvent(name, properties = {}) {
    const event = { name, properties, at: new Date().toISOString() };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...properties });
    try {
      const events = JSON.parse(localStorage.getItem("gh600lab-analytics") || "[]");
      events.push(event);
      localStorage.setItem("gh600lab-analytics", JSON.stringify(events.slice(-100)));
    } catch {
      // Analytics should never block checkout.
    }
    window.dispatchEvent(new CustomEvent("gh600lab:analytics", { detail: event }));
  }

  window.handleCheckout = function handleCheckout(plan, source = "direct") {
    const normalized = normalizedPlan(plan || "founder");
    const checkoutUrl = CHECKOUT_URLS[normalized];
    if (!checkoutUrl) return false;

    saveCheckoutEvent("pricing_clicked", { plan: normalized, source });
    if (normalized === "founder") saveCheckoutEvent("founding_access_clicked", { source });
    saveCheckoutEvent("checkout_redirected", { plan: normalized, provider: "gumroad_direct", source });
    window.location.href = checkoutUrl;
    return true;
  };

  window.addEventListener("click", event => {
    const target = event.target.nodeType === Node.ELEMENT_NODE ? event.target : event.target.parentElement;
    const checkoutButton = target?.closest?.("[data-open-access], #unlock-from-results");
    if (!checkoutButton) return;

    const plan = checkoutButton.id === "unlock-from-results" ? "founder" : normalizedPlan(checkoutButton.dataset.plan || "founder");
    if (!CHECKOUT_URLS[plan]) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    const source = checkoutButton.closest("#pricing") ? "pricing" : checkoutButton.id === "unlock-from-results" ? "results" : "hero";
    window.handleCheckout(plan, source);
  }, true);
})();
