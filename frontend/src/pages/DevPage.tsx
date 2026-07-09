export default function DevPage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="page-inner">
      <div className="dev-state">
        <div className="dev-icon">🚧</div>
        <h2 className="dev-title">{title}</h2>
        <p className="dev-subtitle">
          {description || 'Tính năng này đang được phát triển và sẽ ra mắt trong phiên bản tiếp theo. Cảm ơn bạn đã kiên nhẫn!'}
        </p>
        <div style={{ marginTop: 8 }}>
          <span className="badge badge-dev" style={{ fontSize: 12, padding: '6px 14px' }}>⏳ Đang phát triển</span>
        </div>
      </div>
    </div>
  );
}
