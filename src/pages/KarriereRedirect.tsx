const TARGET = "https://vona-cloud.solutions/karriere/onlineprozess-tester";

const KarriereRedirect = () => {
  return (
    <iframe
      src={TARGET}
      title="Karriere"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        border: "none",
      }}
    />
  );
};

export default KarriereRedirect;
