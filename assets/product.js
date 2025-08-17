function xDataproduct({ product }) {
  const Request = window.qumra.storeGate

  const schema = {
    addToCart: `mutation AddToCart($data: AddToCartInput!) {
  addToCart(data: $data) {
    data {
      _id
      app
      items {
        productId
        _id
        variantId
        productData {
          title
          slug
          app
          image {
            _id
            fileUrl
          }
          price
        }
        variantData {
          compareAtPrice
          options {
            _id
            label
            option {
              _id
              name
            }
          }
          price
        }
        quantity
        price
        compareAtPrice
        totalPrice
        totalCompareAtPrice
        totalSavings
      }
      deviceId
      sessionId
      status
      totalQuantity
      totalPrice
      totalCompareAtPrice
      totalSavings
      isFastOrder
    }
    success
    message
  }
}`,
    buyNow: `mutation BuyNow($data: AddToCartInput!) {
  buyNow(data: $data) {
    success
    message
    url
    encryptionKey
  }
}
    `,
    resolvePrice: `mutation ResolvePrice($input: ResolvePriceInput!) {
  resolvePrice(input: $input) {
    success
    message
    data {
      product {
        _id
        pricing {
          originalPrice
          compareAtPrice
          price
        }
      }
    }
  }
}`
  }
  return {
    productQuantity: 1,
    product,
    localType: null,
    ProductModal: { type: null, data: null, open: false },
    loading: {
      checkout: false,
      priceAtCall: false,
      priceAtCallWhatsApp: false,
      addToCart: false,
      buyNow: false,
    },
    selectedOptions: {},
    resolvedPrice: {},
    get areOptionsSelected() {
      if (product?.options?.length) {
        return product.options.every(opt => Boolean(this.selectedOptions[opt._id]));
      }
      return true; 
    },

    resolvePrice(prod) {
      if (!prod?.options?.length) return;
      const allSelected = prod.options.every(
        (opt) => Boolean(this.selectedOptions[opt._id])
      );
      if (!allSelected) return;

      const selectedOptionValues = prod.options.map(
        (opt) => this.selectedOptions[opt._id]
      );

      const input = {
        productId: prod._id,
        quantity: this.productQuantity,
        options: selectedOptionValues,
      };

      this.loading.priceAtCall = true;
      Request(schema.resolvePrice, { input })
        .then((res) => {
          const ok = res?.resolvePrice?.success;
          if (ok) {
            this.resolvedPrice = res.resolvePrice.data.product.pricing;
            showToast("تم تحديث السعر بنجاح", "success");
          } else {
            showToast(
              res?.resolvePrice?.message || "تعذر تحديث السعر",
              "error"
            );
          }
        })
        .catch(() => showToast("حدث خطأ أثناء تحديث السعر", "error"))
        .finally(() => {
          this.loading.priceAtCall = false;
        });
    },

    initOptions() {
      // if (!product?.options) return;
      // this.selectedOptions = {};
      // product.options.forEach((opt) => {
      //   this.selectedOptions[opt._id] = opt.values?.[0]?._id || null;
      // });
      // this.resolvePrice(product);
      if (product?.options.length == 0) return;
      else showToast("يرجى تحديد الخيارات", "success");

    },

    selectOption(prod, optionId, valueId) {
      this.selectedOptions[optionId] = valueId;
      this.resolvePrice(prod);
    },

    // ------- Form submission -------
    submitForm(e) {
      const form = e.target;
      const formData = new FormData(form);
      const optionsArray = formData.getAll("options[]");
      const productId = formData.get("product");
      const quantity = +formData.get("quantity");
      const btn = e.submitter;

      if (btn?.name === "addToCart") {
        this.addProductToCart(productId, quantity, optionsArray);
      } else if (btn?.name === "buyNow") {
        this.buyNowProduct({
          data: { productId, quantity, options: optionsArray },
        });
      }
    },

    addProductToCart(productId, quantity, options = []) {
      this.updateLoading("addToCart", true);
      Request(schema.addToCart, { data: { productId, quantity, options } })
        .then((res) => {
          const ok = res?.addToCart?.success;
          if (ok) {
            updateCart?.(res.addToCart.data);
            this.toggleProductModal("productDetails", false);
            showToast(
              res?.addToCart?.message || "تمت إضافة المنتج للسلة بنجاح",
              "success"
            );
          } else {
            showToast(
              res?.addToCart?.message || "فشل إضافة المنتج للسلة",
              "error"
            );
          }
        })
        .catch(() => showToast("حدث خطأ أثناء الإضافة للسلة", "error"))
        .finally(() => this.updateLoading("addToCart", false));
    },

    buyNowProduct(payload) {
      this.updateLoading("buyNow", true);
      Request(schema.buyNow, payload)
        .then((res) => {
          const ok = res?.buyNow?.success;
          if (ok && res?.buyNow?.url) {
            showToast("جارٍ تحويلك لصفحة الدفع...", "success", 2000);
            window.location.href = res.buyNow.url;
          } else {
            showToast(res?.buyNow?.message || "فشل عملية الشراء", "error");
          }
        })
        .catch(() => showToast("حدث خطأ أثناء عملية الشراء", "error"))
        .finally(() => this.updateLoading("buyNow", false));
    },

    decreaseCartItem() {
      if (this.productQuantity <= (product?.minQuantity || 1)) {
        showToast(`الحد الادني لكمية المنتج هو ${product?.minQuantity || 1}`, "error");
        return;
      }
      this.productQuantity -= 1;
    },
    increaseCartItem() {
      const max = this.product?.quantity;
      console.log(max, product, this.productQuantity);
      if (this.productQuantity >= max) {
        showToast("لا تتوفر كمية أكثر من هذا المنتج", "error");
        return;
      }
      this.productQuantity += 1;
    },


    checkout() {
      this.loading.checkout = true;
      window.Qumra?.order
        ?.checkout()
        .then((res) => {
          if (res?.url) {
            showToast("جارٍ تحويلك لصفحة الدفع...", "success", 2000);
            window.location.href = res.url;
          } else {
            showToast("تعذر بدء عملية الدفع", "error");
          }
        })
        .catch(() => showToast("حدث خطأ أثناء الدفع", "error"))
        .finally(() => {
          this.loading.checkout = false;
        });
    },

    updateLoading(key, val) {
      if (key in this.loading) this.loading[key] = val;
    },

    toggleProductModal(type, open) {
      this.ProductModal.type = type;
      this.ProductModal.open =
        open !== undefined ? open : !this.ProductModal.open;
      this.quantity = product?.productQuantity || 1;
      this.ProductModal.data = product;
      if (open) this.initOptions();
    },
  };
}

window.xDataproduct = xDataproduct;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("productForm");
  if (!form) return;
  const productHandler = document.querySelector('[x-ref="productComponent"]')
    ?._x_dataStack?.[0];

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const optionsArray = formData.getAll("options[]");
    const productId = formData.get("product");
    const quantity = +formData.get("quantity");
   
    // (context.product.options.length > 0 && Object.keys(selectedOptions).length < context.product.options.length)
console.log(productHandler.areOptionsSelected,product );
  if(product.options.length > 0 && !productHandler.areOptionsSelected) {
    showToast("يرجى تحديد الخيارات", "error");
    return;
  }

    const data = { productId, quantity, options: optionsArray };
    const btn = e.submitter;

    if (btn?.name === "addToCart") {
      productHandler.addProductToCart(productId, quantity, optionsArray);
    } else if (btn?.name === "buyNow") {
      productHandler.buyNowProduct({ data });
    }
  });
});