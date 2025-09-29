import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import VendorQuoteForm from "./components/vendor-quote/VendorQuoteForm";
import FetchVendor from "./common/FetchVendor"; // ✅ wrapper that fetches vendor

function App() {
  return (
    <Router>
      <Routes>
        {/* Default route if someone just goes to / */}
        <Route path="/" element={<VendorQuoteForm />} />

        {/* Vendor-specific route */}
        <Route path="/quotes/:vendorCode" element={<FetchVendor />} />
      </Routes>
    </Router>
  );
}

export default App;
