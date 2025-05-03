import React, { useEffect, useState } from "react";

const AdminPanel = () => {
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("http://localhost:5000/api/discord/validate", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setAllowed(true);
        } else {
          localStorage.clear();
          window.location.href = "/";
        }
      })
      .catch(() => {
        window.location.href = "/";
      })
      .finally(() => {
        setChecked(true);
      });
  }, []);

  if (!checked) return <p>Loading...</p>;
  if (!allowed) return null;

  return (
    <div>
      <h1>Secret Admin Panel</h1>
      <p>Welcome, admin.</p>
    </div>
  );
};

export default AdminPanel;
