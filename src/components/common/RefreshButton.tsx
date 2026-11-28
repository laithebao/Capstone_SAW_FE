import AppIcon from '@/components/common/AppIcon'
import './refresh-button.css'

export default function RefreshButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return <button type="button" className="saw-refresh-button" disabled={loading} onClick={onClick}><AppIcon name="refresh" className={loading ? 'saw-refresh-button__spin' : ''} /> Làm mới</button>
}
