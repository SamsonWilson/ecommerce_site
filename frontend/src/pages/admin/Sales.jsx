import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-qr-code';
import { api } from '../../lib/api.js';
import { useAuth } from '../../store/auth.js';
import { I } from './icons.jsx';
import { PageHead } from './ui.jsx';

const DEFAULT_CUSTOMER_NAME = 'XXXXXXXXXXXX';

const DEFAULT_CUSTOMER = {
  id: 0,
  full_name: DEFAULT_CUSTOMER_NAME,
  email: 'comptoir@maisonlian.com',
};

const formatMoney = (value) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));

const buildMediaUrl = (file) => {
  if (!file) return '';
  if (file.startsWith('http://') || file.startsWith('https://')) return file;

  const base = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/v1$/, '') : 'http://localhost:8000';
  return `${base}${file.startsWith('/') ? file : `/${file}`}`;
};

const getProductColors = (product) => {
  const rawColors = Array.isArray(product?.colors) ? product.colors : [];
  return rawColors
    .map((color) => {
      if (!color) return null;
      if (typeof color === 'string') {
        return { name: color, hex_code: '#C4B5FD' };
      }
      return {
        name: color.name || color.slug || 'Couleur',
        hex_code: color.hex_code || '#C4B5FD',
      };
    })
    .filter(Boolean);
};

const sampleProducts = [
  { id: 1, name: 'Épingle Phénix Cinabre', slug: 'epingle-phenix-cinabre', variants: [{ id: 11, sku: 'PHX-001', stock: 18, retail_price: '48.00', wholesale_price: '36.00' }], category: 'Bijoux', image: '', is_active: true },
  { id: 2, name: 'Diadème Perles Douces', slug: 'diademe-perles-douces', variants: [{ id: 12, sku: 'DIA-018', stock: 9, retail_price: '96.00', wholesale_price: '72.00' }], category: 'Coiffure', image: '', is_active: true },
  { id: 3, name: 'Éventail Brodé Pivoine', slug: 'eventail-brode-pivoine', variants: [{ id: 13, sku: 'EVT-042', stock: 14, retail_price: '62.00', wholesale_price: '46.00' }], category: 'Accessoires', image: '', is_active: true },
  { id: 4, name: 'Bracelet Jade & Or', slug: 'bracelet-jade-or', variants: [{ id: 14, sku: 'BRA-204', stock: 7, retail_price: '74.00', wholesale_price: '55.00' }], category: 'Bijoux', image: '', is_active: true },
];

export default function Sales() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user);
  const cashierName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
    : 'Administrateur';

  const [products, setProducts] = useState(sampleProducts);
  const [loading, setLoading] = useState(true);
  const [productQuery, setProductQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');

  const [customers, setCustomers] = useState([DEFAULT_CUSTOMER]);
  const [selectedCustomer, setSelectedCustomer] = useState(DEFAULT_CUSTOMER);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cart, setCart] = useState([]);
  const [saleMessage, setSaleMessage] = useState({ text: '', type: '', receipt: null });
  const [completedReceipt, setCompletedReceipt] = useState(null);
  const [busy, setBusy] = useState(false);

  const getPaymentLabel = (method) => {
    switch (method) {
      case 'card':
        return 'Carte bancaire';
      case 'cash':
        return 'Espèces';
      case 'transfer':
        return 'Virement';
      default:
        return 'Carte bancaire';
    }
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.adminProducts({ page: 1 });
      const rows = (data.results || data || []).filter((p) => p.is_active !== false);
      setProducts(rows.length ? rows : sampleProducts);
    } catch {
      setProducts(sampleProducts);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const data = await api.adminCustomers({ page: 1 });
      const rows = Array.isArray(data) ? data : (data.results || []);
      const validRows = rows.filter((c) => c && c.id !== 0);
      setCustomers([DEFAULT_CUSTOMER, ...validRows]);
    } catch {
      setCustomers([DEFAULT_CUSTOMER]);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, [loadProducts, loadCustomers]);

  // Extract categories for chips
  const categories = useMemo(() => {
    const list = new Set();
    products.forEach((p) => {
      if (p.category) list.add(p.category);
    });
    return ['Tous', ...Array.from(list)];
  }, [products]);

  // Filter products by search query and category chip
  const filteredProducts = useMemo(() => {
    let result = products;

    if (selectedCategory !== 'Tous') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    const query = productQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((product) => {
        const colors = getProductColors(product).map((color) => color.name.toLowerCase()).join(' ');
        const sku = product.variants?.[0]?.sku || '';
        const haystack = `${product.name} ${product.slug} ${sku} ${colors} ${product.category || ''}`.toLowerCase();
        return haystack.includes(query);
      });
    }

    return result;
  }, [productQuery, selectedCategory, products]);

  const addToCart = (product) => {
    const variant = product.variants?.[0];
    if (!variant) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.variantId === variant.id);
      if (existing) {
        return prev.map((item) =>
          item.variantId === variant.id
            ? { ...item, quantity: Math.min(item.quantity + 1, Number(variant.stock || 99)) }
            : item
        );
      }

      return [
        ...prev,
        {
          variantId: variant.id,
          productId: product.id,
          productName: product.name,
          sku: variant.sku || 'SKU',
          unitPrice: Number(variant.price ?? variant.retail_price ?? 0),
          quantity: 1,
          stock: Number(variant.stock ?? 0),
        },
      ];
    });
  };

  const updateQty = (variantId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variantId !== variantId) return item;
          const nextQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: Math.min(nextQty, item.stock > 0 ? item.stock : 99) };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (variantId) => {
    setCart((prev) => prev.filter((item) => item.variantId !== variantId));
  };

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cart]
  );

  const cartItemsCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const submitSale = async () => {
    const finalCustomerName = customerName.trim() || (selectedCustomer && selectedCustomer.id !== 0 ? (selectedCustomer.full_name || selectedCustomer.email) : '') || DEFAULT_CUSTOMER_NAME;
    const finalCustomerEmail = customerEmail.trim() || selectedCustomer?.email || 'comptoir@maisonlian.com';

    if (!cart.length) {
      setSaleMessage({ text: 'Le panier de vente est vide.', type: 'error', receipt: null });
      return;
    }

    setBusy(true);
    setSaleMessage({ text: '', type: '', receipt: null });

    try {
      const payload = {
        email: finalCustomerEmail,
        payment_method: paymentMethod,
        mark_paid: true,
        shipping_address: {
          method: 'pickup',
          name: finalCustomerName,
          city: 'Paris',
          postal_code: '75000',
          country: 'FR',
          street: 'Boutique Maison Lián',
        },
        items: cart.map((item) => ({
          variant_id: item.variantId,
          quantity: item.quantity,
          product_name: item.productName,
          sku: item.sku,
          unit_price: item.unitPrice,
        })),
      };

      const response = await api.checkout(payload);
      const orderRef = response?.order?.reference || response?.reference || `CMD-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Données du ticket (sans TVA, sans sous-total HT, sans email)
      const receiptData = {
        reference: orderRef,
        date: new Date(),
        customerName: finalCustomerName,
        cashierName: cashierName,
        paymentMethod: paymentMethod,
        items: [...cart],
        total: total,
      };

      setSaleMessage({
        text: `Vente validée avec succès ! Référence : ${orderRef}`,
        type: 'success',
        receipt: receiptData,
      });

      // Ouvrir le ticket et déclencher l'impression
      setCompletedReceipt(receiptData);
      setCart([]);
      setCustomerName('');
      setCustomerEmail('');
      loadProducts();

      // Déclenchement automatique de l'impression du ticket
      setTimeout(() => {
        try {
          window.print();
        } catch {
          // Ignore si le navigateur bloque
        }
      }, 400);
    } catch (error) {
      const detail = error?.data?.detail || error?.message || 'La vente a échoué.';
      setSaleMessage({ text: detail, type: 'error', receipt: null });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="no-print">
        <PageHead
          title={t('admin.sales.title', 'Caisse & Vente directe')}
          subtitle="Enregistrez et encaissez rapidement les commandes en boutique physique."
        >
          <button type="button" className="btn-admin ghost" onClick={loadProducts}>
            {I.check} Actualiser le stock
          </button>
        </PageHead>

        <div className="pos-layout">
          {/* COLONNE GAUCHE : CATALOGUE & RECHERCHE */}
          <section className="pos-catalog-section">
            {/* Barre de recherche & filtres par catégorie */}
            <div className="pos-toolbar">
              <div className="pos-search-row">
                <div className="pos-search-box">
                  {I.search}
                  <input
                    type="text"
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    placeholder="Rechercher par nom, référence SKU, couleur…"
                  />
                  {productQuery && (
                    <button
                      type="button"
                      onClick={() => setProductQuery('')}
                      style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2 }}
                    >
                      {I.cross}
                    </button>
                  )}
                </div>
                <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', fontWeight: 600 }}>
                  {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''}
                </span>
              </div>

              {categories.length > 1 && (
                <div className="pos-category-chips">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`pos-chip ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Grille des produits */}
            {loading ? (
              <div className="admin-empty" style={{ padding: 40 }}>
                Chargement des produits…
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="admin-empty" style={{ padding: 40 }}>
                Aucun produit ne correspond à votre recherche.
              </div>
            ) : (
              <div className="pos-products-grid">
                {filteredProducts.map((product) => {
                  const variant = product.variants?.[0];
                  const price = Number(variant?.price ?? variant?.retail_price ?? 0);
                  const stock = Number(variant?.stock ?? 0);
                  const isOutOfStock = stock <= 0;
                  const isLowStock = stock > 0 && stock <= 5;
                  const image = buildMediaUrl(
                    Array.isArray(product.media)
                      ? (product.media.find((m) => m.media_type === 'IMAGE' || m.media_type === 'image')?.file || product.media[0]?.file || '')
                      : ''
                  );
                  const colors = getProductColors(product);

                  return (
                    <article key={product.id} className="pos-product-card">
                      <div className="pos-product-image">
                        {image ? (
                          <img src={image} alt={product.name} loading="lazy" />
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600 }}>Sans image</span>
                        )}
                        <span
                          className={`pos-product-stock-tag ${
                            isOutOfStock ? 'out-of-stock' : isLowStock ? 'low-stock' : 'in-stock'
                          }`}
                        >
                          {isOutOfStock ? '● Rupture' : isLowStock ? `● ${stock} restants` : `● ${stock} en stock`}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span className="tag-pill tier-1" style={{ fontSize: 10 }}>
                          {product.category || 'Général'}
                        </span>
                        {variant?.sku && (
                          <span className="pos-product-sku" style={{ margin: 0 }}>
                            {variant.sku}
                          </span>
                        )}
                      </div>

                      <h4 className="pos-product-title" title={product.name}>
                        {product.name}
                      </h4>

                      {colors.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                          {colors.slice(0, 4).map((c) => (
                            <span
                              key={c.name}
                              title={c.name}
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: c.hex_code || '#ddd',
                                display: 'inline-block',
                                border: '1px solid rgba(0,0,0,0.15)',
                              }}
                            />
                          ))}
                        </div>
                      )}

                      {/* LIGNE DE STOCK DÉDIÉE BIEN VISIBLE */}
                      <div className="pos-product-stock-row">
                        <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Stock :</span>
                        <span className={`pos-stock-chip ${isOutOfStock ? 'out' : isLowStock ? 'low' : 'available'}`} style={{ whiteSpace: 'nowrap' }}>
                          {isOutOfStock ? '🔴 Rupture' : isLowStock ? `⚠️ ${stock} restant${stock > 1 ? 's' : ''}` : `🟢 ${stock} en stock`}
                        </span>
                      </div>

                      <div className="pos-product-footer">
                        <div className="pos-product-price">{formatMoney(price)}</div>
                        <button
                          type="button"
                          className="pos-add-btn"
                          onClick={() => addToCart(product)}
                          disabled={isOutOfStock}
                          title={isOutOfStock ? 'Article en rupture' : 'Ajouter au panier'}
                        >
                          {I.plus} {isOutOfStock ? 'Épuisé' : 'Ajouter'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* COLONNE DROITE : PANIER STICKY & ENCAISSEMENT */}
          <aside className="pos-cart-panel">
            <div className="pos-cart-header">
              <h3>
                {I.bag} Ticket de caisse
                {cartItemsCount > 0 && (
                  <span className="tag-pill tier-1" style={{ fontSize: 11 }}>
                    {cartItemsCount} article{cartItemsCount > 1 ? 's' : ''}
                  </span>
                )}
              </h3>
              {cart.length > 0 && (
                <button
                  type="button"
                  className="btn-admin ghost"
                  style={{ fontSize: 11, padding: '4px 8px', color: 'var(--muted)' }}
                  onClick={() => setCart([])}
                >
                  Vider
                </button>
              )}
            </div>

            {/* SÉLECTEUR CLIENT */}
            <div className="pos-customer-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text-head)' }}>
                <span>Nom du client</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
                  {customerName.trim() ? 'Saisi' : `Défaut : ${DEFAULT_CUSTOMER_NAME}`}
                </span>
              </div>

              {/* CHAMP DE SAISIE DU NOM DU CLIENT (DÉFAUT XXXXXXXXXXXX) */}
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={DEFAULT_CUSTOMER_NAME}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 7,
                  border: '1px solid var(--line)',
                  background: 'var(--input-bg)',
                  color: 'var(--text)',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              />

              {/* SÉLECTION D'UN COMPTE EXISTANT (FACULTATIF) */}
              <select
                value={selectedCustomer.id || 0}
                onChange={(e) => {
                  const cid = Number(e.target.value);
                  const found = customers.find((c) => (c.id || 0) === cid) || DEFAULT_CUSTOMER;
                  setSelectedCustomer(found);
                  if (found.id !== 0) {
                    setCustomerName(found.full_name || found.email || '');
                    setCustomerEmail(found.email || '');
                  } else {
                    setCustomerName('');
                    setCustomerEmail('');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 7,
                  border: '1px solid var(--line)',
                  background: 'var(--input-bg)',
                  color: 'var(--muted)',
                  fontSize: 11.5,
                }}
              >
                <option value={0}>-- Ou choisir un compte enregistré --</option>
                {customers.filter((c) => c.id !== 0).map((c) => (
                  <option key={c.id || c.email} value={c.id || 0}>
                    👤 {c.full_name || c.email} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            {/* MODE DE RÈGLEMENT */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-head)', marginBottom: 6 }}>
                Mode de paiement
              </div>
              <div className="pos-payment-tabs">
                <button
                  type="button"
                  className={`pos-payment-tab ${paymentMethod === 'card' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  💳 Carte
                </button>
                <button
                  type="button"
                  className={`pos-payment-tab ${paymentMethod === 'cash' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  💵 Espèces
                </button>
                <button
                  type="button"
                  className={`pos-payment-tab ${paymentMethod === 'transfer' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('transfer')}
                >
                  🏦 Virement
                </button>
              </div>
            </div>

            {/* LISTE DES ARTICLES DU PANIER */}
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-head)', marginTop: 2 }}>
              Articles ({cartItemsCount})
            </div>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 14px', color: 'var(--muted)', background: 'var(--bg)', borderRadius: 10, border: '1px dashed var(--line)' }}>
                <div style={{ fontSize: 24, marginBottom: 6, opacity: 0.7 }}>🛒</div>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>Le panier est vide</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Cliquez sur "+ Ajouter" pour insérer des articles</div>
              </div>
            ) : (
              <div className="pos-cart-list">
                {cart.map((item) => (
                  <div key={item.variantId} className="pos-cart-row">
                    <div className="pos-cart-row-info">
                      <div className="pos-cart-row-name" title={item.productName}>
                        {item.productName}
                      </div>
                      <div className="pos-cart-row-price">
                        {formatMoney(item.unitPrice)} · <span style={{ fontFamily: 'monospace' }}>{item.sku}</span>
                      </div>
                    </div>

                    <div className="pos-cart-qty-ctrl">
                      <button
                        type="button"
                        className="pos-cart-qty-btn"
                        onClick={() => updateQty(item.variantId, -1)}
                        title="Diminuer"
                      >
                        −
                      </button>
                      <span style={{ fontSize: 12.5, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="pos-cart-qty-btn"
                        onClick={() => updateQty(item.variantId, 1)}
                        disabled={item.stock > 0 && item.quantity >= item.stock}
                        title="Augmenter"
                      >
                        +
                      </button>
                    </div>

                    <div className="pos-cart-row-total">
                      {formatMoney(item.unitPrice * item.quantity)}
                    </div>

                    <button
                      type="button"
                      className="pos-cart-del-btn"
                      onClick={() => removeFromCart(item.variantId)}
                      title="Supprimer la ligne"
                    >
                      {I.trash}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* RÉCAPITULATIF TOTAL */}
            <div className="pos-total-summary">
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Total à encaisser</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Net à payer</div>
              </div>
              <div className="pos-total-val">{formatMoney(total)}</div>
            </div>

            {/* BOUTON D'ENCAISSEMENT */}
            <button
              type="button"
              className="pos-submit-btn"
              disabled={cart.length === 0 || busy}
              onClick={submitSale}
            >
              {busy ? 'Validation en cours…' : `Valider la vente (${formatMoney(total)})`}
            </button>

            {saleMessage.text && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  background: saleMessage.type === 'success' ? 'rgba(31, 169, 113, 0.12)' : 'rgba(225, 37, 27, 0.12)',
                  color: saleMessage.type === 'success' ? '#1FA971' : '#E1251B',
                  border: `1px solid ${saleMessage.type === 'success' ? 'rgba(31, 169, 113, 0.3)' : 'rgba(225, 37, 27, 0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <span>{saleMessage.text}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {saleMessage.receipt && (
                    <button
                      type="button"
                      className="btn-admin ghost"
                      style={{ padding: '3px 8px', fontSize: 11, borderRadius: 6 }}
                      onClick={() => setCompletedReceipt(saleMessage.receipt)}
                    >
                      🖨️ Ticket
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSaleMessage({ text: '', type: '', receipt: null })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
                  >
                    {I.cross}
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* MODAL DU TICKET DE CAISSE POUR IMPRESSION */}
      {completedReceipt && (
        <div
          className="pos-receipt-modal-backdrop"
          onClick={() => setCompletedReceipt(null)}
        >
          <div
            className="pos-receipt-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* EN-TÊTE MODAL (MASQUÉ À L'IMPRESSION) */}
            <div className="pos-receipt-modal-header">
              <h3>🧾 Ticket de caisse client</h3>
              <button
                type="button"
                onClick={() => setCompletedReceipt(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 4,
                }}
                title="Fermer"
              >
                {I.cross}
              </button>
            </div>

            {/* CONTENU IMPRIMABLE DU TICKET */}
            <div className="pos-receipt-scrollable">
              <div className="pos-receipt-paper">
                <div className="pos-receipt-header">
                  <div className="pos-receipt-brand">MAISON LIÁN</div>
                  <div className="pos-receipt-sub">
                    Haute Joaillerie & Ornements<br />
                    18 Rue de la Paix, 75002 Paris<br />
                    Tél : +33 1 42 68 55 00<br />
                    SIRET : 849 203 145 00018
                  </div>
                </div>

                <hr className="pos-receipt-divider" />

                <div className="pos-receipt-meta">
                  <div className="pos-receipt-meta-row">
                    <span>TICKET N° :</span>
                    <strong style={{ fontFamily: 'monospace' }}>{completedReceipt.reference}</strong>
                  </div>
                  <div className="pos-receipt-meta-row">
                    <span>DATE :</span>
                    <span>
                      {new Intl.DateTimeFormat('fr-FR', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      }).format(new Date(completedReceipt.date))}
                    </span>
                  </div>
                  <div className="pos-receipt-meta-row">
                    <span>CAISSIER :</span>
                    <strong>{completedReceipt.cashierName || cashierName || 'Administrateur'}</strong>
                  </div>
                  <div className="pos-receipt-meta-row">
                    <span>CAISSE :</span>
                    <span>Caisse Boutique #1</span>
                  </div>
                  <div className="pos-receipt-meta-row">
                    <span>CLIENT :</span>
                    <strong style={{ letterSpacing: completedReceipt.customerName === DEFAULT_CUSTOMER_NAME ? '1px' : 'normal' }}>
                      {completedReceipt.customerName}
                    </strong>
                  </div>
                  <div className="pos-receipt-meta-row">
                    <span>RÈGLEMENT :</span>
                    <strong>{getPaymentLabel(completedReceipt.paymentMethod)}</strong>
                  </div>
                </div>

                <hr className="pos-receipt-divider" />

                <div className="pos-receipt-items">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>
                    <span>Désignation / Réf</span>
                    <span>Total</span>
                  </div>

                  {completedReceipt.items.map((item, idx) => (
                    <div key={idx} className="pos-receipt-item-row">
                      <div className="pos-receipt-item-desc">
                        <div className="pos-receipt-item-title">
                          {item.quantity} × {item.productName}
                        </div>
                      </div>
                      <div className="pos-receipt-item-total">
                        {formatMoney(item.unitPrice * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                <hr className="pos-receipt-divider" />

                {/* TOTAL UNIQUE (SANS SOUS-TOTAL HT, SANS TVA) */}
                <div className="pos-receipt-totals">
                  <div className="pos-receipt-total-row pos-receipt-total-main" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
                    <span>TOTAL :</span>
                    <span>{formatMoney(completedReceipt.total)}</span>
                  </div>
                </div>

                <hr className="pos-receipt-divider" />

                <div style={{ textAlign: 'center', padding: '4px 0', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                  ★ TRANSACTION ENCAISSÉE ★
                </div>

                <hr className="pos-receipt-divider" />

                <div className="pos-receipt-footer">
                  Merci pour votre confiance.<br />
                  À bientôt chez Maison Lián !<br />
                  <span style={{ fontSize: 9.5, opacity: 0.8 }}>
                    Échange possible sous 14 jours sur présentation du ticket.
                  </span>
                </div>

                {/* CODE QR AU BAS DU TICKET */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 14 }}>
                  <div style={{ background: '#ffffff', padding: 6, borderRadius: 6, border: '1px solid #e2e8f0', display: 'inline-block' }}>
                    <QRCode
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/compte/commandes?ref=${completedReceipt.reference}`}
                      size={86}
                      viewBox="0 0 256 256"
                      style={{ height: 'auto', maxWidth: '100%', width: 86 }}
                    />
                  </div>
                  <div style={{ fontSize: 9.5, color: '#64748b', marginTop: 6, textAlign: 'center' }}>
                    Scannez pour retrouver votre commande
                  </div>
                  <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#64748b', marginTop: 2 }}>
                    {completedReceipt.reference}
                  </div>
                </div>
              </div>
            </div>

            {/* BOUTONS D'ACTION (MASQUÉS À L'IMPRESSION) */}
            <div className="pos-receipt-modal-actions">
              <button
                type="button"
                className="pos-receipt-btn-print"
                onClick={() => window.print()}
              >
                🖨️ Imprimer le ticket
              </button>
              <button
                type="button"
                className="pos-receipt-btn-close"
                onClick={() => setCompletedReceipt(null)}
              >
                ✓ Nouvelle vente
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

