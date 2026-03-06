const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001/api'
    : `${window.location.origin}/api`;
let S = { user: JSON.parse(localStorage.getItem('admin_user')), orders: [], prods: [], cats: [], coupons: [], shipping: [], cfg: {}, counts: { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 }, statData: { d: 0, w: 0, m: 0 }, activeTab: 'dashboard', eventSource: null };

/* AUTH */
function initAdmin() { if (S.user) startAdmin(); else showPage('login-page'); }
async function login() { const e = document.getElementById('lemail').value.trim(); const p = document.getElementById('lpass').value.trim(); const err = document.getElementById('lerr'); err.style.display = 'none'; if (!e || !p) { err.textContent = 'دخل البيانات المطلوبة'; err.style.display = 'block'; return; } const b = document.getElementById('lbtn'); b.disabled = true; b.textContent = 'جاري التحقق...'; try { const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e, password: p }) }); const data = await r.json(); if (!r.ok) throw new Error(data.error || 'بيانات الدخول غلط'); S.user = data.user; localStorage.setItem('admin_token', data.token); localStorage.setItem('admin_user', JSON.stringify(data.user)); startAdmin(); } catch (err_msg) { err.textContent = err_msg.message; err.style.display = 'block'; } finally { b.disabled = false; b.textContent = 'دخول السيطرة'; } }
function startAdmin() { showPage('dash-page'); document.getElementById('user-name').textContent = S.user.username; document.getElementById('user-role').textContent = S.user.role; loadTab(S.activeTab); initSSE(); }
function showPage(id) { document.getElementById('login-page').style.display = id === 'login-page' ? 'flex' : 'none'; document.getElementById('dash-page').classList.toggle('show', id === 'dash-page'); if (id === 'dash-page') document.getElementById('dash-page').style.display = 'flex'; }

/* SSE */
function initSSE() { if (S.eventSource) S.eventSource.close(); S.eventSource = new EventSource(`${API}/orders/stream`); S.eventSource.onmessage = e => { const data = JSON.parse(e.data); if (data.type === 'new_order') { playNotifSound(); showNewOrderNotif(data.order_number); if (S.activeTab === 'orders') loadTab('orders'); else fetchCounts(); } }; S.eventSource.onerror = () => { setTimeout(initSSE, 5000); }; }
function playNotifSound() { const a = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); a.play().catch(() => { }); }
function showNewOrderNotif(num) { const n = document.getElementById('new-order-notif'); document.getElementById('new-order-num').textContent = num; n.classList.add('on'); setTimeout(() => n.classList.remove('on'), 8000); }

/* NAVIGATION */
function switchTab(t) { S.activeTab = t; document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.tab === t)); loadTab(t); }
async function loadTab(t) { const c = document.getElementById('tab-content'); c.innerHTML = '<div style="padding:100px;text-align:center"><div style="width:34px;height:34px;border:3px solid #222;border-top-color:var(--gold);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto"></div></div>'; switch (t) { case 'dashboard': await renderDashboard(); break; case 'orders': await renderOrders(); break; case 'products': await renderProducts(); break; case 'categories': await renderCategories(); break; case 'shipping': await renderShipping(); break; case 'coupons': await renderCoupons(); break; case 'settings': await renderSettings(); break; }fetchCounts(); }
async function fetchCounts() { try { const r = await fetch(`${API}/orders/stats`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` } }); const data = await r.json(); S.counts = data.counts; S.statData = data.periods; updateNavBadges(); } catch (e) { } }
function updateNavBadges() { const p = S.counts.pending || 0; const b = document.getElementById('badge-pending'); if (b) { b.textContent = p; b.style.display = p > 0 ? 'inline-block' : 'none'; } }

/* RENDER TABS */
async function renderDashboard() { const c = document.getElementById('tab-content'); const stats = S.statData; c.innerHTML = `<div class="stats-grid"><div class="stat-card green"><div class="stat-val green" id="st-d">${stats.daily.toFixed(0)}</div><div class="stat-lbl">مبيعات اليوم</div></div><div class="stat-card blue"><div class="stat-val blue" id="st-w">${stats.weekly.toFixed(0)}</div><div class="stat-lbl">مبيعات الأسبوع</div></div><div class="stat-card gold"><div class="stat-val gold" id="st-m">${stats.monthly.toFixed(0)}</div><div class="stat-lbl">مبيعات الشهر</div></div><div class="stat-card red"><div class="stat-val red">${S.counts.pending}</div><div class="stat-lbl">طلبات معلقة</div></div></div><div class="form-box"><div class="form-title">إحصائيات الحالة</div><div class="stats-grid"><div class="stat-card" style="border-color:#5aaff5"><div class="stat-val" style="color:#5aaff5">${S.counts.pending}</div><div class="stat-lbl">جديد</div></div><div class="stat-card" style="border-color:#f5a544"><div class="stat-val" style="color:#f5a544">${S.counts.processing}</div><div class="stat-lbl">قيد التنفيذ</div></div><div class="stat-card" style="border-color:#b57ff5"><div class="stat-val" style="color:#b57ff5">${S.counts.shipped}</div><div class="stat-lbl">تم الشحن</div></div><div class="stat-card" style="border-color:#5af57a"><div class="stat-val" style="color:#5af57a">${S.counts.delivered}</div><div class="stat-lbl">تم الاستلام</div></div></div></div>`; }
async function renderOrders() { const c = document.getElementById('tab-content'); try { const r = await fetch(`${API}/orders`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` } }); S.orders = await r.json(); c.innerHTML = `<div class="sec-title">إدارة الطلبات <span id="ord-cnt">(${S.orders.length})</span></div><div class="filter-bar"><input class="search-box" id="o-search" placeholder="ابحث برقم الطلب أو اسم العميل..." oninput="filterOrders()"><select class="filter-sel" id="o-filter" onchange="filterOrders()"><option value="all">كل الحالات</option><option value="pending">جديد</option><option value="processing">قيد التنفيذ</option><option value="shipped">تم الشحن</option><option value="delivered">تم الاستلام</option><option value="cancelled">ملغي</option></select></div><div class="table-wrap"><table id="ord-table"><thead><tr><th>الطلب #</th><th>التاريخ</th><th>العميل</th><th>المحافظة</th><th>الإجمالي</th><th>طريقة الدفع</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody id="ord-body">${renderOrderRows(S.orders)}</tbody></table></div>`; } catch (e) { c.innerHTML = 'خطأ في التحميل'; } }
function renderOrderRows(os) { return os.map(o => `<tr><td><b style="font-family:monospace;color:var(--gold)">${o.order_number}</b></td><td style="font-size:11px;color:var(--text2)">${new Date(o.created_at).toLocaleString('ar-EG')}</td><td><b>${o.customer_name}</b><br><span style="font-size:11px;color:var(--text2)">${o.phone}</span></td><td>${o.governorate}</td><td style="font-weight:900;color:var(--gold)">${o.total} ج.م</td><td>${o.payment_method === 'cash' ? '💵 كاش' : '💳 فيزا'}</td><td><span class="status-badge ${o.status}">${tStatus(o.status)}</span></td><td class="td-actions"><button class="icon-btn" onclick="viewOrder(${o.id})" title="عرض المعلومات">👁️</button><button class="icon-btn del" onclick="delOrder(${o.id})" title="حذف">🗑️</button></td></tr>`).join(''); }
function tStatus(s) { const m = { pending: 'جديد', processing: 'قيد التنفيذ', shipped: 'تم الشحن', delivered: 'تم الاستلام', cancelled: 'ملغي' }; return m[s] || s; }
function filterOrders() { const q = document.getElementById('o-search').value.trim().toLowerCase(); const f = document.getElementById('o-filter').value; const filtered = S.orders.filter(o => (o.order_number.toLowerCase().includes(q) || o.customer_name.toLowerCase().includes(q)) && (f === 'all' || o.status === f)); document.getElementById('ord-body').innerHTML = renderOrderRows(filtered); document.getElementById('ord-cnt').textContent = `(${filtered.length})`; }

/* PRODUCT MGT */
async function renderProducts() { const c = document.getElementById('tab-content'); try { const r = await fetch(`${API}/products`); S.prods = await r.json(); const rc = await fetch(`${API}/categories`); S.cats = await rc.json(); c.innerHTML = `<div class="sec-title">إدارة المنتجات <span>(${S.prods.length})</span></div><div class="filter-bar"><input class="search-box" id="p-search" placeholder="ابحث بالاسم أو SKU..." oninput="filterProds()"><button class="btn-gold" onclick="openAddProd()">+ منتج جديد</button></div><div class="table-wrap"><table><thead><tr><th>المنتج</th><th>القسم</th><th>السعر</th><th>SKU</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody id="p-body">${renderProdRows(S.prods)}</tbody></table></div>`; } catch (e) { } }
function renderProdRows(ps) { const base = API.replace('/api', ''); return ps.map(p => `<tr><td><div style="display:flex;align-items:center;gap:12px"><img src="${p.main_image ? base + p.main_image : ''}" class="td-img"><div><b>${p.name_ar}</b><br><span style="font-size:11px;color:var(--text2)">${p.name_en || ''}</span></div></div></td><td>${getCatName(p.category_id)}</td><td style="font-weight:900;color:var(--gold)">${p.price} ج.م</td><td><span style="font-family:monospace">${p.sku}</span></td><td><span class="status-badge delivered">${p.is_active ? 'نشط' : 'مخفي'}</span></td><td><div class="td-actions"><button class="icon-btn warn" onclick="openEditProd(${p.id})">✏️</button><button class="icon-btn del" onclick="delProd(${p.id})">🗑️</button></div></td></tr>`).join(''); }
function getCatName(id) { const c = S.cats.find(x => x.id == id); return c ? c.name_ar : '-'; }
function filterProds() { const q = document.getElementById('p-search').value.trim().toLowerCase(); const filtered = S.prods.filter(p => p.name_ar.includes(q) || (p.name_en || '').toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)); document.getElementById('p-body').innerHTML = renderProdRows(filtered); }

async function renderCategories() { const c = document.getElementById('tab-content'); try { const r = await fetch(`${API}/categories`); S.cats = await r.json(); c.innerHTML = `<div class="sec-title">إدارة الأقسام</div><div class="form-box"><div class="form-title">إضافة قسم جديد</div><div class="form-grid"><div class="fg"><label>الاسم بالعربي</label><input id="c-name-ar" placeholder="مثلاً: قمصان"></div><div class="fg"><label>الاسم بالانجليزي</label><input id="c-name-en" placeholder="مثلاً: Shirts"></div><div class="fg"><label>القسم الأب (اختياري)</label><select id="c-parent"><option value="">قسم رئيسي</option>${S.cats.map(cat => `<option value="${cat.id}">${cat.name_ar}</option>`).join('')}</select></div></div><div class="btn-row"><button class="btn-gold" onclick="addCat()">حفظ القسم</button></div></div><div id="cats-tree">${renderCatTree(null)}</div>`; } catch (e) { } }
function renderCatTree(pid) { const kids = S.cats.filter(c => pid ? c.parent_id == pid : !c.parent_id); if (!kids.length) return ''; return kids.map(k => `<div class="tree-item"><div class="ti-name">${k.name_ar} <span class="ti-tag">${k.name_en || ''}</span></div><div class="ti-actions"><button class="icon-btn del" onclick="delCat(${k.id})">🗑️</button></div></div><div class="tree-children">${renderCatTree(k.id)}</div>`).join(''); }

async function renderShipping() { const c = document.getElementById('tab-content'); try { const r = await fetch(`${API}/shipping`); S.shipping = await r.json(); c.innerHTML = `<div class="sec-title">إدارة الشحن</div><div class="form-box"><div class="ship-table">${S.shipping.map(s => `<div class="ship-row"><div class="ship-gov">${s.governorate}</div><input class="ship-inp" type="number" id="sh-${s.id}" value="${s.price}"><span>ج.م</span><button class="btn-gold" style="padding:6px 14px;margin-right:auto" onclick="saveShip(${s.id})">تحديث</button></div>`).join('')}</div></div>`; } catch (e) { } }

async function renderCoupons() { const c = document.getElementById('tab-content'); try { const r = await fetch(`${API}/coupons`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` } }); S.coupons = await r.json(); c.innerHTML = `<div class="sec-title">إدارة الكوبونات</div><div class="form-box"><div class="form-title">إضافة كوبون جديد</div><div class="form-grid"><div class="fg"><label>الكود</label><input id="cp-code" placeholder="SALE20"></div><div class="fg"><label>نوع الخصم</label><select id="cp-type"><option value="percent">نسبة مئوية (%)</option><option value="fixed">مبلغ ثابت (ج.م)</option></select></div><div class="fg"><label>القيمة</label><input id="cp-val" type="number" placeholder="20"></div><div class="fg"><label>الحد الأدنى للطلب</label><input id="cp-min" type="number" value="0"></div></div><div class="btn-row"><button class="btn-gold" onclick="addCoupon()">حفظ الكوبون</button></div></div><div class="table-wrap"><table><thead><tr><th>الكود</th><th>الخصم</th><th>الحد الأدنى</th><th>الاستخدام</th><th>إجراء</th></tr></thead><tbody>${S.coupons.map(cp => `<tr><td><b style="font-family:monospace;color:var(--gold);letter-spacing:2px">${cp.code}</b></td><td>${cp.value}${cp.type === 'percent' ? '%' : ' ج.م'}</td><td>${cp.min_subtotal} ج.م</td><td>${cp.usage_count} مرة</td><td><button class="icon-btn del" onclick="delCoupon(${cp.id})">🗑️</button></td></tr>`).join('')}</tbody></table></div>`; } catch (e) { } }

async function renderSettings() { const c = document.getElementById('tab-content'); try { const r = await fetch(`${API}/settings`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` } }); S.cfg = await r.json(); c.innerHTML = `<div class="sec-title">إعدادات الموقع</div><div class="form-box"><div class="form-title">معلومات المحل</div><div class="form-grid"><div class="fg"><label>واتساب للطلبات</label><input id="cfg-wa" value="${S.cfg.whatsapp1 || ''}"></div><div class="fg"><label>تليفون التواصل</label><input id="cfg-ph" value="${S.cfg.phone || ''}"></div><div class="fg"><label>رابط TikTok</label><input id="cfg-tt" value="${S.cfg.tiktok_url || ''}"></div><div class="fg"><label>رابط Facebook</label><input id="cfg-fb" value="${S.cfg.facebook_url || ''}"></div></div></div><div class="form-box"><div class="form-title">شريط الإعلانات</div><div class="form-grid" style="grid-template-columns:1fr"><div class="fg"><label>تفعيل شريط الإعلان</label><select id="cfg-ann-on"><option value="true" ${S.cfg.announcement_active === 'true' ? 'selected' : ''}>نعم، تفعيل</option><option value="false" ${S.cfg.announcement_active === 'false' ? 'selected' : ''}>لا، إخفاء</option></select></div><div class="fg"><label>نص الإعلان</label><textarea id="cfg-ann-txt">${S.cfg.announcement_text || ''}</textarea></div></div></div><div class="form-box"><div class="form-title">وضع الصيانة</div><div class="form-grid"><div class="fg"><label>تفعيل وضع الصيانة</label><select id="cfg-maint"><option value="true" ${S.cfg.maintenance_mode === 'true' ? 'selected' : ''}>نعم، صيانة</option><option value="false" ${S.cfg.maintenance_mode === 'false' ? 'selected' : ''}>لا، الموقع يعمل</option></select></div><div class="fg"><label>سبب الصيانة</label><input id="cfg-m-res" value="${S.cfg.maintenance_reason || ''}"></div></div></div><div class="btn-row" style="justify-content:center"><button class="btn-gold" style="width:300px;font-size:18px" onclick="saveSettings()">حفظ الإعدادات بالكامل</button></div>`; } catch (e) { } }

/* ACTIONS */
async function addCat() { const ar = document.getElementById('c-name-ar').value.trim(); if (!ar) return; const payload = { name_ar: ar, name_en: document.getElementById('c-name-en').value.trim(), parent_id: document.getElementById('c-parent').value || null }; try { await fetch(`${API}/categories`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }, body: JSON.stringify(payload) }); toast('تم الحفظ ✓', 'ok'); loadTab('categories'); } catch (e) { } }
async function delCat(id) { if (!confirm('هيمسح القسم بالأقسام اللي جواه! متأكد؟')) return; try { await fetch(`${API}/categories/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` } }); loadTab('categories'); } catch (e) { } }
async function saveShip(id) { const v = document.getElementById(`sh-${id}`).value; try { await fetch(`${API}/shipping`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }, body: JSON.stringify({ id, price: parseFloat(v) }) }); toast('تم التحديث ✓', 'ok'); } catch (e) { } }
async function addCoupon() { const c = document.getElementById('cp-code').value.trim(); const v = document.getElementById('cp-val').value; if (!c || !v) return; try { await fetch(`${API}/coupons`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }, body: JSON.stringify({ code: c.toUpperCase(), type: document.getElementById('cp-type').value, value: parseFloat(v), min_subtotal: parseFloat(document.getElementById('cp-min').value) || 0 }) }); loadTab('coupons'); } catch (e) { } }
async function delCoupon(id) { try { await fetch(`${API}/coupons/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` } }); loadTab('coupons'); } catch (e) { } }
async function saveSettings() { const payload = { whatsapp1: document.getElementById('cfg-wa').value, phone: document.getElementById('cfg-ph').value, tiktok_url: document.getElementById('cfg-tt').value, facebook_url: document.getElementById('cfg-fb').value, announcement_active: document.getElementById('cfg-ann-on').value, announcement_text: document.getElementById('cfg-ann-txt').value, maintenance_mode: document.getElementById('cfg-maint').value, maintenance_reason: document.getElementById('cfg-m-res').value }; try { await fetch(`${API}/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }, body: JSON.stringify(payload) }); toast('تم حفظ الإعدادات ✓', 'ok'); } catch (e) { } }

/* ORDER DETAILS */
async function viewOrder(id) { const o = S.orders.find(x => x.id == id); const items = JSON.parse(o.items || '[]'); document.getElementById('mc-body').innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px"><div><label style="color:var(--text2);font-size:11px">العميل</label><p style="font-size:16px;font-weight:900">${o.customer_name}</p><p style="font-size:14px;color:var(--gold);direction:ltr">${o.phone}</p>${o.phone2 ? `<p style="font-size:12px;color:var(--text2)">إضافي: ${o.phone2}</p>` : ''}</div><div><label style="color:var(--text2);font-size:11px">العنوان</label><p><b>${o.governorate}</b></p><p style="font-size:13px;color:var(--text2)">${o.address}</p></div></div><div style="background:var(--surf2);padding:14px;margin-bottom:20px;border:1px solid var(--border)"><label style="color:var(--text2);font-size:11px">حالة الطلب الحالية</label><div style="display:flex;gap:10px;margin-top:8px"><select id="upd-status" class="filter-sel" style="flex:1"><option value="pending" ${o.status === 'pending' ? 'selected' : ''}>جديد 🔵</option><option value="processing" ${o.status === 'processing' ? 'selected' : ''}>قيد التنفيذ 🟠</option><option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>تم الشحن 🟣</option><option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>تم الاستلام 🟢</option><option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>ملغي 🔴</option></select><button class="btn-gold" onclick="updateStatus(${o.id})">تحديث</button></div></div><div class="table-wrap"><table><thead><tr><th>المنتج</th><th>الخيارات</th><th>السعر</th><th>الكمية</th><th>المجموع</th></tr></thead><tbody>${items.map(i => `<tr><td><b>${i.name}</b><br><span style="font-size:10px;color:var(--text2)">${i.sku}</span></td><td>${i.color || '-'} / ${i.size || '-'}</td><td>${i.price} ج.م</td><td>x${i.qty}</td><td style="color:var(--gold)">${i.price * i.qty} ج.م</td></tr>`).join('')}</tbody></table></div><div style="margin-top:20px;text-align:left;padding:15px;background:rgba(255,255,255,.02);border:1px solid var(--border)"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>المنتجات</span><span>${o.subtotal} ج.م</span></div><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>الشحن</span><span>${o.shipping_cost} ج.م</span></div><div style="display:flex;justify-content:space-between;margin-bottom:12px;color:var(--red)"><span>الخصم</span><span>${o.discount} ج.م-</span></div><div style="display:flex;justify-content:space-between;font-size:22px;font-weight:900;color:var(--gold)"><span>الإجمالي</span><span>${o.total} ج.م</span></div></div><div style="margin-top:20px;display:flex;gap:10px"><button class="btn-outline" style="flex:1" onclick="printOrder()">🖨️ طباعة فاتورة</button><button class="btn-outline" style="flex:1;border-color:#25d366;color:#25d366" onclick="window.open('https://wa.me/2${o.phone}','_blank')">💬 واتساب العميل</button></div>`; document.getElementById('ord-modal').classList.add('on'); }
async function updateStatus(id) { const s = document.getElementById('upd-status').value; try { await fetch(`${API}/orders/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }, body: JSON.stringify({ status: s }) }); toast('تم تحديث الحالة ✓', 'ok'); document.getElementById('ord-modal').classList.remove('on'); loadTab('orders'); } catch (e) { } }
async function delOrder(id) { if (!confirm('عايز تمسح الطلب ده نهائي؟')) return; try { await fetch(`${API}/orders/${id}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }, method: 'DELETE' }); loadTab('orders'); } catch (e) { } }

/* PRODUCT MODAL */
function openAddProd() { fetchCats(); document.getElementById('prod-modal-title').textContent = 'إضافة منتج جديد'; document.getElementById('p-form').reset(); document.getElementById('p-id').value = ''; document.getElementById('p-vars').innerHTML = ''; document.getElementById('prod-detail-modal').classList.add('on'); }
async function openEditProd(id) { await fetchCats(); const p = S.prods.find(x => x.id == id); if (!p) return; document.getElementById('prod-modal-title').textContent = 'تعديل المنتج'; document.getElementById('p-id').value = p.id; document.getElementById('p-name-ar').value = p.name_ar; document.getElementById('p-name-en').value = p.name_en || ''; document.getElementById('p-price').value = p.price; document.getElementById('p-sku').value = p.sku; document.getElementById('p-cat').value = p.category_id; document.getElementById('p-desc').value = p.description || ''; document.getElementById('p-m-c-ar').value = p.main_color_ar || ''; document.getElementById('p-m-c-en').value = p.main_color_en || ''; document.getElementById('p-sizes').value = (p.sizes || []).join(','); const vWrap = document.getElementById('p-vars'); vWrap.innerHTML = ''; if (p.variants) p.variants.forEach(v => addVarUI(v)); document.getElementById('prod-detail-modal').classList.add('on'); }
function addVarUI(v = {}) { const div = document.createElement('div'); div.className = 'form-box var-item'; div.innerHTML = `<div class="form-grid"><div class="fg"><label>اللون (عربي)</label><input class="v-c-ar" value="${v.color_ar || v.color || ''}"></div><div class="fg"><label>المقاسات (بـ , )</label><input class="v-sizes" value="${(v.sizes || []).join(',')}"></div><div class="fg"><label>المخزن</label><input type="number" class="v-stock" value="${v.stock ?? 100}"></div><div class="fg"><label>صورة اللون</label><input type="file" class="v-img" accept="image/*"></div></div><button class="btn-outline del" style="margin-top:10px" onclick="this.parentElement.remove()">✕ إزالة هذا اللون</button>`; document.getElementById('p-vars').appendChild(div); }
async function fetchCats() { const r = await fetch(`${API}/categories`); S.cats = await r.json(); document.getElementById('p-cat').innerHTML = S.cats.map(c => `<option value="${c.id}">${c.name_ar}</option>`).join(''); }
async function saveProd() {
    const btn = document.getElementById('p-save-btn');
    btn.disabled = true;
    const id = document.getElementById('p-id').value;

    // 1. Upload Main Image if exists
    const mainFile = document.getElementById('p-img').files[0];
    let mainPath = null;
    if (mainFile) {
        const fd = new FormData();
        fd.append('image', mainFile);
        try {
            const r = await fetch(`${API}/products/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
                body: fd
            });
            const d = await r.json();
            mainPath = d.path;
        } catch (e) {
            toast('فشل رفع الصورة الأساسية', 'err');
        }
    }

    // 2. Build Variants and Upload Variant Images
    const vars = [];
    const varEls = document.querySelectorAll('.var-item');
    for (const el of varEls) {
        const c_ar = el.querySelector('.v-c-ar').value.trim();
        if (!c_ar) continue;

        const imgFile = el.querySelector('.v-img').files[0];
        let imgPath = null;
        if (imgFile) {
            const fd = new FormData();
            fd.append('image', imgFile);
            try {
                const r = await fetch(`${API}/products/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
                    body: fd
                });
                const d = await r.json();
                imgPath = d.path;
            } catch (e) {
                toast('فشل رفع صورة اللون', 'err');
            }
        }

        vars.push({
            color_ar: c_ar,
            sizes: el.querySelector('.v-sizes').value.split(',').map(s => s.trim()).filter(s => s),
            stock: parseInt(el.querySelector('.v-stock').value) || 0,
            image: imgPath
        });
    }

    // 3. Build Final Payload
    const payload = {
        name_ar: document.getElementById('p-name-ar').value,
        name_en: document.getElementById('p-name-en').value,
        price: parseFloat(document.getElementById('p-price').value),
        sku: document.getElementById('p-sku').value,
        category_id: parseInt(document.getElementById('p-cat').value),
        description: document.getElementById('p-desc').value,
        main_color_ar: document.getElementById('p-m-c-ar').value,
        main_color_en: document.getElementById('p-m-c-en').value,
        sizes: document.getElementById('p-sizes').value.split(',').map(s => s.trim()).filter(s => s),
        variants: vars,
        hidden: 0
    };
    if (mainPath) payload.main_image = mainPath;

    // 4. Send to Server
    try {
        const url = id ? `${API}/products/${id}` : `${API}/products`;
        const method = id ? 'PUT' : 'POST';
        const r = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify(payload)
        });

        if (!r.ok) {
            const errData = await r.json();
            throw new Error(errData.error || 'فشل الحفظ');
        }

        toast('تم الحفظ بنجاح ✓', 'ok');
        document.getElementById('prod-detail-modal').classList.remove('on');
        loadTab('products');
    } catch (e) {
        toast(e.message, 'err');
    } finally {
        btn.disabled = false;
    }
}
async function delProd(id) { if (!confirm('هتمسح المنتج ده؟')) return; try { await fetch(`${API}/products/${id}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }, method: 'DELETE' }); loadTab('products'); } catch (e) { } }

/* UTILS */
function toast(m, t = 'info') { const el = document.createElement('div'); el.className = `toast ${t}`; el.textContent = m; document.getElementById('toast-wrap').appendChild(el); setTimeout(() => { el.style.opacity = '0'; el.style.transition = '.3s'; setTimeout(() => el.remove(), 300); }, 2800); }
function logout() { localStorage.clear(); location.reload(); }
function printOrder() { window.print(); }
initAdmin();
setInterval(() => { if (S.user) document.getElementById('clock').textContent = new Date().toLocaleTimeString('ar-EG'); }, 1000);
