import { Link, useLocation } from "react-router-dom";

export default function Sidebar(){
  const { pathname } = useLocation();
  const item = (to, label) => (
    <Link className="sideitem" style={{
      background: pathname===to ? "#eef2ff" : "#fff",
      border: "1px solid #e5e7eb", borderRadius:10, marginBottom:8, padding:10, display:"block"
    }} to={to}>{label}</Link>
  );

  return (
    <div className="sidebar">
      <div style={{fontWeight:800, marginBottom:10}}>Mess Admin</div>
      {item("/staff","Overview")}
      {item("/staff#attendance","Attendance")}
      {item("/staff#wastage","Food Wastage")}
    </div>
  );
}
