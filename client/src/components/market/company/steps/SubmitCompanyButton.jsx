import { useNavigate } from "react-router-dom";

const SubmitCompanyButton = ({ form }) => {
  const navigate = useNavigate();

  const handlePreview = () => {
    if (!form.name.trim()) {
      alert("Company name is required.");
      return;
    }

    navigate("/market/create-company/preview", { state: { form } });
  };

  return (
    <button onClick={handlePreview} className="submit-company-btn">
      Preview
    </button>
  );
};

export default SubmitCompanyButton;
