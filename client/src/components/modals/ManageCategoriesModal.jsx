import React, { useCallback, useEffect, useState } from "react";
import "../market/css/DeleteConfirmModal.css";

const ManageCategoriesModal = ({ shopId, onClose }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const ac = new AbortController();
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/market/shop/${shopId}/categories`, {
        signal: ac.signal,
      });
      const d = await r.json();
      setCategories(d.categories || []);
    } catch (e) {
      if (e?.name !== "AbortError") setError("Failed to load categories");
    } finally {
      setLoading(false);
    }
    return () => ac.abort();
  }, [shopId]);

  useEffect(() => {
    const cleanup = load();
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [load]);

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const r = await fetch(`/api/market/shop/${shopId}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newName }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed to create");
      setNewName("");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditName(c.name);
    setError("");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveEdit = async (id) => {
    if (!editName.trim()) return;
    setBusyId(id);
    setError("");
    try {
      const r = await fetch(`/api/market/shop/${shopId}/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: editName }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed to rename");
      setEditingId(null);
      setEditName("");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this category? Items using it will lose the tag."))
      return;
    setBusyId(id);
    setError("");
    try {
      const r = await fetch(`/api/market/shop/${shopId}/categories/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed to delete");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="delete-modal-backdrop" role="dialog" aria-modal="true">
      <div className="delete-modal" style={{ maxWidth: 640, width: "100%" }}>
        <h3>Manage Categories</h3>
        {error && <p style={{ color: "#e74c3c" }}>{error}</p>}

        <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              className="companies-search form-control"
              placeholder="New category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button
              className="delete-modal-btn delete-modal-btn-confirm"
              onClick={create}
              disabled={creating}
            >
              {creating ? "Adding..." : "Add"}
            </button>
          </div>
        </div>

        {loading ? (
          <p>Loading…</p>
        ) : (
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {categories.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  padding: "6px 0",
                  opacity: c.shop_id ? 1 : 0.85,
                }}
              >
                {editingId === c.id ? (
                  <>
                    <input
                      className="companies-search form-control"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <button
                      className="delete-modal-btn"
                      onClick={cancelEdit}
                      disabled={busyId === c.id}
                    >
                      Cancel
                    </button>
                    <button
                      className="delete-modal-btn delete-modal-btn-confirm"
                      onClick={() => saveEdit(c.id)}
                      disabled={busyId === c.id}
                    >
                      Save
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1 }}>
                      {c.name}{" "}
                      {!c.shop_id && <em style={{ opacity: 0.6 }}>(global)</em>}
                    </span>
                    {c.shop_id && (
                      <>
                        <button
                          className="delete-modal-btn"
                          onClick={() => startEdit(c)}
                          disabled={busyId === c.id}
                        >
                          Rename
                        </button>
                        <button
                          className="delete-modal-btn"
                          onClick={() => remove(c.id)}
                          disabled={busyId === c.id}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
            {categories.length === 0 && <p>No categories yet.</p>}
          </div>
        )}

        <div
          className="delete-modal-actions"
          style={{ marginTop: 12, justifyContent: "center" }}
        >
          <button
            className="delete-modal-btn delete-modal-btn-confirm"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageCategoriesModal;
