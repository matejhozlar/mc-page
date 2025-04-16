import React, { useState } from "react";

const ApplyToJoin = () => {
  const [formData, setFormData] = useState({
    mcName: "",
    dcName: "",
    age: "",
    howFound: "",
    experience: "",
    whyJoin: "",
  });

  const [submissionStatus, setSubmissionStatus] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation for required fields
    if (
      !formData.mcName ||
      !formData.dcName ||
      !formData.age ||
      !formData.whyJoin
    ) {
      setSubmissionStatus("Please fill in all required fields.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmissionStatus("Application submitted successfully!");
        setFormData({
          mcName: "",
          dcName: "",
          age: "",
          howFound: "",
          experience: "",
          whyJoin: "",
        });
      } else {
        setSubmissionStatus("Error submitting application.");
      }
    } catch (error) {
      console.error("Error submitting application:", error);
      setSubmissionStatus("Error submitting application.");
    }
  };

  return (
    <div className="apply-to-join">
      <h2>Apply to Join Our Server</h2>

      {/* Alert/Status Message */}
      {submissionStatus && (
        <div className="alert-submit">{submissionStatus}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="mcName">
            Minecraft Name <span className="required">*</span>
          </label>
          <input
            type="text"
            id="mcName"
            name="mcName"
            value={formData.mcName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="dcName">
            Discord Name <span className="required">*</span>
          </label>
          <input
            type="text"
            id="dcName"
            name="dcName"
            value={formData.dcName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="age">
            Age <span className="required">*</span>
          </label>
          <input
            type="number"
            id="age"
            name="age"
            value={formData.age}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="howFound">How Did You Find Our Server?</label>
          <input
            type="text"
            id="howFound"
            name="howFound"
            value={formData.howFound}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="experience">Minecraft Experience</label>
          <textarea
            id="experience"
            name="experience"
            value={formData.experience}
            onChange={handleChange}
            rows="3"
          />
        </div>

        <div className="form-group">
          <label htmlFor="whyJoin">
            Why Do You Want to Join Our Server?{" "}
            <span className="required">*</span>
          </label>
          <textarea
            id="whyJoin"
            name="whyJoin"
            value={formData.whyJoin}
            onChange={handleChange}
            rows="3"
            required
          />
        </div>

        <button type="submit" className="submit-button">
          Submit Application
        </button>
      </form>
    </div>
  );
};

export default ApplyToJoin;
