/**
 * Opening Package Restriction
 * Prevents customers from re-ordering opening packages they have already purchased.
 *
 * Logic:
 * - If customer tags contain "HELIOCARE Opening Package" -> can't purchase products with title containing "HELIOCARE Opening Package"
 * - If customer tags contain "BIRETIX Opening Package" -> can't purchase products with title containing "BIRETIX Opening Package"
 */

(function () {
  'use strict';

  // Configuration: mapping of customer tags to restricted product title keywords
  const OPENING_PACKAGE_RESTRICTIONS = [
    {
      tag: 'HELIOCARE Introductory Package',
      productKeyword: 'HELIOCARE Introductory Package',
    },
    {
      tag: 'BIRETIX Introductory Package',
      productKeyword: 'BIRETIX Introductory Package',
    },
    {
      tag: 'ENDOCARE Introductory Package',
      productKeyword: 'ENDOCARE Introductory Package',
    },
    {
      tag: 'ENDOCARE Core Package',
      productKeyword: 'ENDOCARE Core Package',
    },
    {
      tag: 'Cantabria Labs Introductory Package',
      productKeyword: 'Cantabria Labs Introductory Package',
    },
  ];

  const RESTRICTION_MESSAGE =
    'Sorry, you have already purchased this introductory package. Please choose a different product to order.';
  const BUTTON_TEXT_RESTRICTED = 'Already Purchased';
  const PROCESSED_ATTRIBUTE = 'data-restriction-processed';

  // Flag to prevent re-entrancy during DOM modifications
  let isProcessing = false;
  let debounceTimer = null;

  /**
   * Get customer tags from the global window object (set in theme.liquid)
   */
  function getCustomerTags() {
    return window.customerTags || [];
  }

  /**
   * Check if a product title is restricted based on customer tags
   * @param {string} productTitle - The product title to check
   * @returns {boolean} - True if the product is restricted
   */
  function isProductRestricted(productTitle) {
    if (!productTitle) return false;

    const customerTags = getCustomerTags();
    const titleLower = productTitle.toLowerCase();

    for (const restriction of OPENING_PACKAGE_RESTRICTIONS) {
      const hasTag = customerTags.some(
        (tag) => tag.toLowerCase() === restriction.tag.toLowerCase(),
      );

      if (
        hasTag &&
        titleLower.includes(restriction.productKeyword.toLowerCase())
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get product title from variant row by traversing the DOM
   */
  function getProductTitleFromVariantRow(variantRow) {
    // Look for the variant table parent
    const variantTable = variantRow.closest('table.prd_variants');
    if (!variantTable) return '';

    // The product row is before the variant container
    const variantContainer = variantTable.closest('tr');
    if (!variantContainer) return '';

    const productRow = variantContainer.previousElementSibling;
    if (productRow) {
      return (
        productRow
          .querySelector('.list-view-item__title a')
          ?.textContent?.trim() || ''
      );
    }

    return '';
  }

  /**
   * Process a single element and mark it as restricted if applicable
   */
  function processElement(element) {
    // Skip if already processed
    if (element.hasAttribute(PROCESSED_ATTRIBUTE)) {
      return;
    }

    const productTitle = element.dataset.openingPackageProductTitle;
    if (!productTitle || !isProductRestricted(productTitle)) {
      // Mark as processed even if not restricted to avoid re-checking
      element.setAttribute(PROCESSED_ATTRIBUTE, 'true');
      return;
    }

    // Mark as processed immediately
    element.setAttribute(PROCESSED_ATTRIBUTE, 'true');

    // Mark the element itself if it's a row
    if (
      element.classList.contains('resp-table-row') ||
      element.classList.contains('prd_variant')
    ) {
      element.classList.add('opening-package-restricted');

      // Disable quantity inputs
      const qtyInputs = element.querySelectorAll('.list-product-qty');
      qtyInputs.forEach((input) => {
        input.disabled = true;
        input.value = 0;
        input.title = RESTRICTION_MESSAGE;
      });

      // Disable and update add to cart button text
      const addButton = element.querySelector('.singleCart');
      if (addButton) {
        addButton.disabled = true;
        addButton.title = RESTRICTION_MESSAGE;
        const buttonSpan = addButton.querySelector('span');
        if (buttonSpan) {
          buttonSpan.textContent = BUTTON_TEXT_RESTRICTED;
        } else {
          addButton.textContent = BUTTON_TEXT_RESTRICTED;
        }
      }

      // Disable quantity +/- buttons
      const qtyButtons = element.querySelectorAll('.qtyminus, .qtyplus');
      qtyButtons.forEach((btn) => {
        btn.disabled = true;
      });
    }
  }

  /**
   * Process a variant row that doesn't have the data attribute
   */
  function processVariantRow(row) {
    // Skip if already processed
    if (row.hasAttribute(PROCESSED_ATTRIBUTE)) {
      return;
    }

    const productTitle = getProductTitleFromVariantRow(row);
    if (!productTitle || !isProductRestricted(productTitle)) {
      row.setAttribute(PROCESSED_ATTRIBUTE, 'true');
      return;
    }

    // Mark as processed immediately
    row.setAttribute(PROCESSED_ATTRIBUTE, 'true');
    row.classList.add('opening-package-restricted');

    const qtyInputs = row.querySelectorAll('.list-product-qty');
    qtyInputs.forEach((input) => {
      input.disabled = true;
      input.value = 0;
      input.title = RESTRICTION_MESSAGE;
    });

    const addButton = row.querySelector('.singleCart');
    if (addButton) {
      addButton.disabled = true;
      addButton.title = RESTRICTION_MESSAGE;
      const buttonSpan = addButton.querySelector('span');
      if (buttonSpan) {
        buttonSpan.textContent = BUTTON_TEXT_RESTRICTED;
      } else {
        addButton.textContent = BUTTON_TEXT_RESTRICTED;
      }
    }

    const qtyButtons = row.querySelectorAll('.qtyminus, .qtyplus');
    qtyButtons.forEach((btn) => {
      btn.disabled = true;
    });
  }

  /**
   * Add visual indicators to restricted products on collection pages
   */
  function markRestrictedProducts() {
    // Prevent re-entrancy
    if (isProcessing) {
      return;
    }

    isProcessing = true;

    try {
      // Mark products on collection pages - only unprocessed elements
      document
        .querySelectorAll(
          '[data-opening-package-product-title]:not([' +
            PROCESSED_ATTRIBUTE +
            '])',
        )
        .forEach((element) => {
          processElement(element);
        });

      // Also check variant rows that might not have the data attribute yet
      document
        .querySelectorAll(
          '.prd_variant:not([data-opening-package-product-title]):not([' +
            PROCESSED_ATTRIBUTE +
            '])',
        )
        .forEach((row) => {
          processVariantRow(row);
        });
    } finally {
      isProcessing = false;
    }
  }

  /**
   * Debounced version of markRestrictedProducts for MutationObserver
   */
  function debouncedMarkRestrictedProducts() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(function () {
      markRestrictedProducts();
    }, 100);
  }

  /**
   * Disable product page add to cart if restricted
   */
  function disableProductPageAddToCart() {
    const productTitle = window.openingPackageProductTitle;
    if (!productTitle || !isProductRestricted(productTitle)) return;

    // Find and disable the main add to cart button
    const submitButtons = document.querySelectorAll(
      '.product-form__submit, #ProductSubmitButton, [name="add"]',
    );
    submitButtons.forEach((button) => {
      if (button.closest('product-form')) {
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
        button.title = RESTRICTION_MESSAGE;

        // Update button text
        const buttonText = button.querySelector('span');
        if (buttonText) {
          buttonText.textContent = BUTTON_TEXT_RESTRICTED;
        }
      }
    });

    // Add a notice message after the price block
    const productInfo = document.querySelector(
      'product-info, .product__info-container',
    );
    if (productInfo && !productInfo.querySelector('.opening-package-notice')) {
      // Add a notice message
      const notice = document.createElement('div');
      notice.className = 'opening-package-notice';
      notice.innerHTML = `
        <p style="background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 1rem; border-radius: 4px; margin-bottom: 1rem;">
          <strong>Notice:</strong> ${RESTRICTION_MESSAGE}
        </p>
      `;

      const priceBlock = productInfo.querySelector('[id^="price-"]');
      if (priceBlock) {
        priceBlock.insertAdjacentElement('afterend', notice);
      }
    }

    // Disable dynamic checkout buttons
    const dynamicCheckoutButtons = document.querySelectorAll(
      '.shopify-payment-button button',
    );
    dynamicCheckoutButtons.forEach((button) => {
      button.disabled = true;
      button.style.opacity = '0.5';
      button.style.cursor = 'not-allowed';
    });
  }

  /**
   * Initialize the restriction functionality
   */
  function init() {
    // Only run if customer tags are available (customer is logged in)
    if (!window.customerTags || window.customerTags.length === 0) {
      return;
    }

    // Check if any restrictions apply
    const hasRestrictions = OPENING_PACKAGE_RESTRICTIONS.some((restriction) =>
      window.customerTags.some(
        (tag) => tag.toLowerCase() === restriction.tag.toLowerCase(),
      ),
    );

    if (!hasRestrictions) {
      return;
    }

    // Mark restricted products and disable buttons after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        markRestrictedProducts();
        disableProductPageAddToCart();
      });
    } else {
      markRestrictedProducts();
      disableProductPageAddToCart();
    }

    // Re-run marking when new content is loaded (e.g., load more in multicart)
    // Use a more targeted approach - only watch for new table rows
    const observer = new MutationObserver(function (mutations) {
      let hasNewRows = false;

      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if the added node is a table row or contains table rows
              if (
                node.classList &&
                (node.classList.contains('resp-table-row') ||
                  node.classList.contains('prd_variant') ||
                  node.querySelector('.resp-table-row, .prd_variant'))
              ) {
                hasNewRows = true;
                break;
              }
            }
          }
        }
        if (hasNewRows) break;
      }

      if (hasNewRows) {
        debouncedMarkRestrictedProducts();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Expose functions for external use
  window.OpeningPackageRestriction = {
    isProductRestricted: isProductRestricted,
    getCustomerTags: getCustomerTags,
    markRestrictedProducts: markRestrictedProducts,
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
