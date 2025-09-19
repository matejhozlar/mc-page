import React, { useEffect, useState } from "react";

const defaultField = { name: "", value: "", inline: false };

export default function AdminEmbedBuilder() {
  const [channels, setChannels] = useState([]);
  const [channelKey, setChannelKey] = useState("");
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#5865F2");
  const [fields, setFields] = useState([{ ...defaultField }]);
  const [footer, setFooter] = useState("");
  const [thumbnail, setThumbnail] = useState("");

  useEffect(() => {
    fetch("/api/admin/messages/channels", { credentials: "include" })
      .then((r) => r.json())
      .then(({ channels }) => {
        setChannels(channels);
        setChannelKey(channels?.[0]?.key ?? "");
      });
  }, []);

  const addField = () => setFields((f) => [...f, { ...defaultField }]);
  const updateField = (i, patch) =>
    setFields((f) => f.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const removeField = (i) => setFields((f) => f.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault();
    const body = {
      channelKey,
      content,
      embed: {
        title,
        description,
        color,
        fields: fields.filter((f) => f.name && f.value),
        footer,
        thumbnail,
      },
    };
    const res = await fetch("/api/admin/messages/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const json = await res.json();
    alert(json.ok ? "Sent for review ✅" : json.error || "Failed");
  };

  return (
    <div className="embed-builder">
      <h2>Embed / Message Builder</h2>

      <label>Target channel</label>
      <select
        value={channelKey}
        onChange={(e) => setChannelKey(e.target.value)}
      >
        {channels.map((c) => (
          <option key={c.key} value={c.key}>
            {c.key} ({c.id})
          </option>
        ))}
      </select>

      <label>Message content (optional)</label>
      <textarea value={content} onChange={(e) => setContent(e.target.value)} />

      <h3>Embed</h3>
      <label>Title</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />

      <label>Description</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <label>Color</label>
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
      />

      <label>Thumbnail URL</label>
      <input value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} />

      <label>Footer</label>
      <input value={footer} onChange={(e) => setFooter(e.target.value)} />

      <h4>Fields</h4>
      {fields.map((f, i) => (
        <div
          key={i}
          style={{ border: "1px solid #333", padding: 8, marginBottom: 8 }}
        >
          <input
            placeholder="Name"
            value={f.name}
            onChange={(e) => updateField(i, { name: e.target.value })}
          />
          <textarea
            placeholder="Value"
            value={f.value}
            onChange={(e) => updateField(i, { value: e.target.value })}
          />
          <label>
            <input
              type="checkbox"
              checked={f.inline}
              onChange={(e) => updateField(i, { inline: e.target.checked })}
            />
            inline
          </label>
          <button type="button" onClick={() => removeField(i)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={addField}>
        + Add field
      </button>

      <h3>Preview</h3>
      <div className="discord-preview">
        <div>
          <b>{title}</b>
        </div>
        <div>{description}</div>
        {fields.map((f, i) => (
          <div key={i}>
            <b>{f.name}</b>: {f.value} {f.inline ? "(inline)" : ""}
          </div>
        ))}
        {footer && <div style={{ opacity: 0.8, marginTop: 8 }}>— {footer}</div>}
      </div>

      <button onClick={submit}>Submit for review</button>
    </div>
  );
}
