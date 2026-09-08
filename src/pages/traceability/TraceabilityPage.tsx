import { useParams } from 'react-router'

export default function TraceabilityPage() {
  const { qrCode } = useParams<'qrCode'>()

  return (
    <>
      <h1>Truy xuất nguồn gốc</h1>
      <p>Mã QR: {qrCode}. Trang công khai; thông tin lô hàng sẽ được tích hợp sau.</p>
    </>
  )
}
