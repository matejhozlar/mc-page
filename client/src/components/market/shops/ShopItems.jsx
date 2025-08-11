import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import ItemCard from "./ItemCard.jsx";
import ItemFormModal from "../../modals/ItemFormModal.jsx";
import ConfirmModal from "../../modals/ConfirmModal.jsx";
import StatusPopupModal from "../../modals/StatusPopupModal.jsx";
import CategoryChipsSelect from "./CategoryChipsSelect.jsx";
import "../css/Companies.css";

const ShopItems = ({ shopId, isFounder }) => {
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);

  const [categories, setCategories] = useState([]);
  const [selectedCats, setSelectedCats] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [visibleCount, setVisibleCount] = useState(5);

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [savingItem, setSavingItem] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const ac = new AbortController();
    setItemsLoading(true);
    Promise.all([
      fetch(`/api/market/shop/${shopId}/items`, { signal: ac.signal }).then(
        (r) =>
          r.ok ? r.json() : Promise.reject(new Error("Failed to load items"))
      ),
      fetch(`/api/market/shop/${shopId}/categories`, {
        signal: ac.signal,
      }).then((r) => (r.ok ? r.json() : { categories: [] })),
    ])
      .then(([itemsRes, catsRes]) => {
        setItems(itemsRes.items || []);
        setCategories(catsRes.categories || []);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") console.error("❌ items load:", e);
      })
      .finally(() => setItemsLoading(false));

    return () => ac.abort();
  }, [shopId]);

  const filtered = useMemo(() => {
    let res = [...items];

    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          (i.sku?.toLowerCase() || "").includes(q)
      );
    }

    if (selectedCats.length) {
      res = res.filter((i) => {
        const ids = i.category_ids || [];
        return selectedCats.every((id) => ids.includes(id));
      });
    }

    res.sort((a, b) => {
      if (sort === "price_asc") return Number(a.price) - Number(b.price);
      if (sort === "price_desc") return Number(b.price) - Number(a.price);
      if (sort === "name") return a.name.localeCompare(b.name);
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return res;
  }, [items, search, selectedCats, sort]);

  const visibleItems = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  useEffect(() => {
    setVisibleCount(5);
  }, [search, selectedCats, sort]);

  const quickAddCategory = async (name) => {
    try {
      const r = await fetch(`/api/market/shop/${shopId}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed to create category");

      const r2 = await fetch(`/api/market/shop/${shopId}/categories`);
      const d2 = await r2.json();
      setCategories(d2.categories || []);
      setToast({
        type: "success",
        message: `Category "${d.category.name}" created`,
      });
      return d.category;
    } catch (e) {
      setToast({
        type: "error",
        message: e.message || "Failed to create category",
      });
      return null;
    }
  };

  const createItem = async (form) => {
    const body = {
      name: form.name,
      price: Number(form.price || 0),
      stock: Number.isFinite(Number(form.stock)) ? Number(form.stock) : 0,
      sku: form.sku,
      description: form.description,
      category_ids: form.category_ids || [],
    };
    if (!body.name?.trim())
      return setToast({ type: "error", message: "Name is required" });
    if (body.price < 0 || body.stock < 0)
      return setToast({ type: "error", message: "Invalid price/stock" });

    try {
      setSavingItem(true);
      const res = await fetch(`/api/market/shop/${shopId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to add item");
      setItems((prev) => [data.item, ...prev]);
      setShowCreate(false);
      setToast({ type: "success", message: "Item added" });
    } catch (e) {
      setToast({ type: "error", message: e.message || "Failed to add item" });
    } finally {
      setSavingItem(false);
    }
  };

  const updateItem = async (itemId, patch) => {
    try {
      setBusyId(itemId);
      const res = await fetch(`/api/market/shop/${shopId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to update item");
      setItems((prev) => prev.map((i) => (i.id === itemId ? data.item : i)));
      setToast({ type: "success", message: "Item updated" });
    } catch (e) {
      setToast({
        type: "error",
        message: e.message || "Failed to update item",
      });
      throw e;
    } finally {
      setBusyId(null);
      setEditItem(null);
      setSavingItem(false);
    }
  };

  const deleteItemConfirmed = async () => {
    if (!confirmDelete) return;
    try {
      setBusyId(confirmDelete.id);
      const res = await fetch(
        `/api/market/shop/${shopId}/items/${confirmDelete.id}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to delete item");
      }
      setItems((prev) => prev.filter((i) => i.id !== confirmDelete.id));
      setToast({ type: "success", message: "Item deleted" });
    } catch (e) {
      setToast({ type: "error", message: e.message || "Failed to delete" });
    } finally {
      setConfirmDelete(null);
      setBusyId(null);
    }
  };

  return (
    <div className="company-content" style={{ marginTop: "2rem" }}>
      <div className="companies-header" style={{ marginBottom: 12 }}>
        <h2>Items</h2>
        <div
          className="companies-controls"
          style={{ gap: 8, flexWrap: "wrap" }}
        >
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="companies-search form-control"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="companies-search form-control"
          >
            <option value="newest">Newest</option>
            <option value="name">Name (A–Z)</option>
            <option value="price_asc">Price ↑</option>
            <option value="price_desc">Price ↓</option>
          </select>

          {categories.length > 0 && (
            <CategoryChipsSelect
              categories={categories}
              value={selectedCats}
              onChange={setSelectedCats}
              allowCreate={false}
              showActions={true}
              compact
              title="Filter categories"
            />
          )}

          {isFounder && (
            <button
              className="shop-page-button"
              onClick={() => setShowCreate(true)}
            >
              <Plus size={20} className="item-shift" /> Add Item
            </button>
          )}
        </div>
      </div>

      {itemsLoading ? (
        <p>Loading items…</p>
      ) : filtered.length === 0 ? (
        <p>No items found.</p>
      ) : (
        <>
          <div className="companies-cards-grid">
            {visibleItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                categories={categories}
                busy={busyId === item.id}
                canManage={isFounder}
                onEdit={() => setEditItem(item)}
                onToggleVisibility={async () => {
                  const next = item.status === "hidden" ? "active" : "hidden";
                  await updateItem(item.id, { status: next });
                }}
                onDelete={() =>
                  setConfirmDelete({ id: item.id, name: item.name })
                }
              />
            ))}
          </div>
          {hasMore && (
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button
                className="shop-page-button"
                onClick={() => setVisibleCount((prev) => prev + 5)}
              >
                Show More
              </button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showCreate && (
        <ItemFormModal
          title="Add Item"
          categories={categories}
          onQuickAddCategory={quickAddCategory}
          canCreateCategories={isFounder}
          initial={{
            name: "",
            price: "",
            stock: "",
            sku: "",
            description: "",
            category_ids: [],
          }}
          onSave={createItem}
          onCancel={() => setShowCreate(false)}
          saving={savingItem}
        />
      )}

      {editItem && (
        <ItemFormModal
          title={`Edit ${editItem.name}`}
          categories={categories}
          onQuickAddCategory={quickAddCategory}
          canCreateCategories={isFounder}
          initial={{
            name: editItem.name,
            price: editItem.price,
            stock: editItem.stock,
            sku: editItem.sku,
            description: editItem.description,
            category_ids: editItem.category_ids || [],
          }}
          onSave={async (form) => {
            setSavingItem(true);
            const patch = {
              name: form.name,
              price: Number(form.price || 0),
              stock: Number.isFinite(Number(form.stock))
                ? Number(form.stock)
                : 0,
              sku: form.sku,
              description: form.description,
              category_ids: form.category_ids || [],
            };
            await updateItem(editItem.id, patch);
          }}
          onCancel={() => setEditItem(null)}
          saving={savingItem}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete item?"
          message={`This will permanently delete "${confirmDelete.name}".`}
          confirmLabel="Delete"
          confirmTone="danger"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={deleteItemConfirmed}
        />
      )}

      {toast && (
        <StatusPopupModal
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default ShopItems;
