import React from "react";
import WaitlistNotice from "./WaitlistNotice";

const ApplyToJoin = () => {
  return (
    <div className="apply-to-join">
      <WaitlistNotice />

      {/* 
      <h2 className="apply-heading">Apply to Join Our Server</h2>

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

        {submissionStatus && (
          <div className="alert alert-success alert-submit">
            {submissionStatus}
          </div>
        )}

        <button type="submit" className="submit-button">
          Submit Application
        </button>
      </form>
      */}
    </div>
  );
};

export default ApplyToJoin;
