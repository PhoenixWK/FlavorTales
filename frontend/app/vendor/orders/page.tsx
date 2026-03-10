export default function OrdersPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-3xl mb-5">
        🧾
      </div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Orders</h2>
      <p className="text-sm text-gray-400 max-w-xs">
        Incoming orders and their statuses will be managed here. Coming soon.
      </p>
    </div>
  );
}
