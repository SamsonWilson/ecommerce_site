import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api.js';
import { I } from './icons.jsx';
import { PageHead, Panel } from './ui.jsx';

const DEFAULT_CUSTOMER_NAME = 'XXXXXXXXXXXX';

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
  const [products, setProducts] = useState(sampleProducts);
  const [loading, setLoading] = useState(true);
  const [productQuery, setProductQuery] = useState('');
  const [customerSearch, setCustomerSearch] = useState(DEFAULT_CUSTOMER_NAME);
  const [customers, setCustomers] = useState([{ id: 0, full_name: DEFAULT_CUSTOMER_NAME, email: 'client@inconnu.local' }]);
  const [selectedCustomer, setSelectedCustomer] = useState({ id: 0, full_name: DEFAULT_CUSTOMER_NAME, email: 'client@inconnu.local' });
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cart, setCart] = useState([]);
  const [saleMessage, setSaleMessage] = useState('');
  const [busy, setBusy] = useState(false);

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
      const list = rows.length ? rows : [{ id: 0, full_name: DEFAULT_CUSTOMER_NAME, email: 'client@inconnu.local' }];
      setCustomers(list);
      setSelectedCustomer((current) => current?.id ? current : list[0] || { id: 0, full_name: DEFAULT_CUSTOMER_NAME, email: 'client@inconnu.local' });
    } catch {
      const fallback = [{ id: 0, full_name: DEFAULT_CUSTOMER_NAME, email: 'client@inconnu.local' }];
      setCustomers(fallback);
      setSelectedCustomer(fallback[0]);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, [loadProducts, loadCustomers]);

  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    if (!query) return products;

    return products.filter((product) => {
      const colors = getProductColors(product).map((color) => color.name.toLowerCase()).join(' ');
      const haystack = `${product.name} ${product.slug} ${colors} ${product.category || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [productQuery, products]);

  const customerMatches = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) return customers;

    return customers.filter((customer) => {
      const haystack = `${customer.full_name || customer.email || ''} ${customer.email || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [customerSearch, customers]);

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
          sku: variant.sku,
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
          return { ...item, quantity: nextQty };
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
    const finalCustomerEmail = customerEmail.trim() || selectedCustomer?.email || 'client@inconnu.local';
    setCustomerEmail(finalCustomerEmail);

    if (!finalCustomerEmail) {
      setSaleMessage('Ajoute une adresse e-mail client avant de valider la vente.');
      return;
    }
    if (!cart.length) {
      setSaleMessage('Le panier de vente est vide.');
      return;
    }

    setBusy(true);
    setSaleMessage('');

    try {
      const payload = {
        email: finalCustomerEmail,
        payment_method: paymentMethod,
        mark_paid: true,
        shipping_address: {
          method: 'pickup',
          name: 'Vente directe admin',
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
      const orderRef = response?.order?.reference || response?.reference || 'CMD';
      setSaleMessage(`Vente validée avec succès — référence ${orderRef}.`);
      setCart([]);
      setCustomerEmail('');
      loadProducts();
    } catch (error) {
      const detail = error?.data?.detail || error?.message || 'La vente a échoué.';
      setSaleMessage(detail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead
        title={t('admin.sales.title', 'Ventes')}
        subtitle="Vente directe en boutique : recherchez les produits et le client puis validez la commande."
      >
        <button type="button" className="btn-admin ghost" onClick={loadProducts}>
          {I.check} Actualiser
        </button>
      </PageHead>

      <div style={{
        background: 'linear-gradient(135deg, #1f2937 0%, #4f46e5 45%, #a855f7 100%)',
        borderRadius: 24,
        padding: 22,
        marginBottom: 20,
        color: '#fff',
        boxShadow: '0 20px 40px rgba(79, 70, 229, 0.22)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.8 }}>Caisse</div>
            <div style={{ fontSize: 34, fontWeight: 800, marginTop: 6 }}>Vente directe</div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 14, padding: '10px 14px', minWidth: 120 }}>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Produits</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{filteredProducts.length}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 14, padding: '10px 14px', minWidth: 120 }}>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Panier</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{cartItemsCount}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 14, padding: '10px 14px', minWidth: 150 }}>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Total</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{formatMoney(total)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid #E9EEF6', borderRadius: 18, padding: 14, boxShadow: '0 12px 24px rgba(15, 23, 42, 0.04)' }}>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: 8, color: '#1f2937' }}>Recherche produit</label>
            <input
              type="text"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Rechercher un produit, catégorie ou couleur"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #DDE5F0', fontSize: 14, background: '#F9FAFF' }}
            />
          </div>

          <div style={{ background: '#fff', border: '1px solid #E9EEF6', borderRadius: 18, padding: 14, boxShadow: '0 12px 24px rgba(15, 23, 42, 0.04)' }}>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: 8, color: '#1f2937' }}>Client</label>
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder={DEFAULT_CUSTOMER_NAME}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #DDE5F0', fontSize: 14, background: '#F9FAFF' }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {customerMatches.slice(0, 4).map((customer) => (
                <button
                  key={customer.id || customer.email || customer.full_name}
                  type="button"
                  className="btn-admin ghost"
                  style={{ padding: '6px 10px', fontSize: 12, borderRadius: 999 }}
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setCustomerSearch(customer.full_name || customer.email || DEFAULT_CUSTOMER_NAME);
                    setCustomerEmail(customer.email || '');
                  }}
                >
                  {customer.full_name || customer.email || DEFAULT_CUSTOMER_NAME}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.9fr', gap: 22, alignItems: 'start' }}>
        <div>
          <Panel title="Produits en vente">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
              {loading && <div className="admin-empty" style={{ gridColumn: '1 / -1' }}>Chargement des produits…</div>}

              {!loading && filteredProducts.map((product) => {
                const variant = product.variants?.[0];
                const price = Number(variant?.price ?? variant?.retail_price ?? 0);
                const stock = Number(variant?.stock ?? 0);
                const image = buildMediaUrl(Array.isArray(product.media) ? (product.media.find((m) => m.media_type === 'IMAGE' || m.media_type === 'image')?.file || product.media[0]?.file || '') : '');
                const colors = getProductColors(product);

                return (
                  <div key={product.id} style={{ border: '1px solid #EEF2FF', borderRadius: 20, padding: 14, background: 'linear-gradient(180deg, #ffffff 0%, #faf7ff 100%)', boxShadow: '0 12px 24px rgba(99, 102, 241, 0.06)' }}>
                    <div style={{ width: '100%', height: 150, borderRadius: 16, overflow: 'hidden', background: 'linear-gradient(135deg, #f5f3ff 0%, #eef2ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      {image ? (
                        <img src={image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ color: '#475569', fontWeight: 700 }}>Aucune image</div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                      <span className="tag-pill tier-1" style={{ fontSize: 10 }}>{product.category || 'Produit'}</span>
                      <span className={stock > 0 ? 'status paid' : 'status cancelled'}>{stock > 0 ? `${stock} en stock` : 'Rupture'}</span>
                    </div>

                    <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 6, lineHeight: 1.3 }}>{product.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{variant?.sku || 'SKU'}</div>

                    {colors.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                        {colors.map((color) => (
                          <span key={`${product.id}-${color.name}`} title={color.name} style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.1)', background: color.hex_code || '#C4B5FD', display: 'inline-block', boxShadow: '0 0 0 2px rgba(255,255,255,0.8)' }} />
                        ))}
                        <span style={{ fontSize: 11, color: '#64748b' }}>{colors.map((color) => color.name).join(', ')}</span>
                      </div>
                    )}

                    <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, color: '#111827' }}>{formatMoney(price)}</div>

                    <button type="button" className="btn-admin primary" style={{ width: '100%', borderRadius: 12, padding: '12px 10px', fontWeight: 700 }} onClick={() => addToCart(product)}>
                      {I.plus} Ajouter à la vente
                    </button>
                  </div>
                );
              })}

              {!loading && filteredProducts.length === 0 && (
                <div className="admin-empty" style={{ gridColumn: '1 / -1' }}>Aucun produit correspondant à votre recherche.</div>
              )}
            </div>
          </Panel>
        </div>

        <div>
          <Panel title="Panier de vente">
            <div style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f3f4f6 100%)', borderRadius: 18, padding: 14, border: '1px solid #edf2f7', marginBottom: 12 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 700 }}>Nom du client</label>
                <input
                  type="text"
                  value={selectedCustomer?.full_name || DEFAULT_CUSTOMER_NAME}
                  readOnly
                  style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #DDE5F0', background: '#ffffff' }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 700 }}>E-mail client</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder={selectedCustomer?.email || 'client@example.com'}
                  style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #DDE5F0', background: '#ffffff' }}
                />
              </div>

              <div style={{ marginBottom: 0 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 700 }}>Mode de paiement</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #DDE5F0', background: '#ffffff' }}
                >
                  <option value="card">Carte bancaire</option>
                  <option value="cash">Espèces</option>
                  <option value="transfer">Virement</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="admin-empty" style={{ borderRadius: 12, background: '#f8fafc', padding: 20 }}>Aucun produit dans le panier.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {cart.map((item) => (
                  <div key={item.variantId} style={{ border: '1px solid #E9EEF6', borderRadius: 16, padding: 12, background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', boxShadow: '0 8px 18px rgba(15, 23, 42, 0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                      <div>
                        <strong style={{ fontSize: 14 }}>{item.productName}</strong>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{item.sku}</div>
                      </div>
                      <button type="button" className="btn-admin ghost" onClick={() => removeFromCart(item.variantId)}>
                        {I.cross}
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button type="button" className="btn-admin ghost" onClick={() => updateQty(item.variantId, -1)}>-</button>
                        <strong>{item.quantity}</strong>
                        <button type="button" className="btn-admin ghost" onClick={() => updateQty(item.variantId, 1)}>+</button>
                      </div>
                      <strong>{formatMoney(item.unitPrice * item.quantity)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #E9EEF6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                <span>Total</span>
                <span>{formatMoney(total)}</span>
              </div>
            </div>

            <button type="button" className="btn-admin primary" style={{ width: '100%', marginTop: 16, borderRadius: 14, padding: '14px 12px', fontWeight: 800 }} onClick={submitSale} disabled={busy}>
              {busy ? 'Validation…' : 'Valider la vente'}
            </button>

            {saleMessage && (
              <div style={{ marginTop: 14, padding: 10, borderRadius: 12, background: saleMessage.includes('succès') ? '#ECFDF5' : '#FFF7ED', color: saleMessage.includes('succès') ? '#166534' : '#9A4D00', fontWeight: 600 }}>
                {saleMessage}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
