import React from 'react';

interface StrategicRecommendationViewProps {
  recommendation: string;
  riskLevel: string;
  safeStorageDays?: number | null;
  predictedLossPercent?: number | null;
}

interface SectionItem {
  id: number;
  title: string;
  content: string;
  icon: string;
  badge: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  highlightTag?: string;
}

export const StrategicRecommendationView: React.FC<StrategicRecommendationViewProps> = ({
  recommendation,
  riskLevel,
  safeStorageDays,
  predictedLossPercent,
}) => {
  if (!recommendation) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
        Chưa có nhận định nguyên nhân & giải pháp từ hệ thống.
      </div>
    );
  }

  // Parse nội dung markdown có chứa các đề mục ###
  const sections: SectionItem[] = [];
  const lines = recommendation.split('\n');

  let currentTitle = '';
  let currentContent: string[] = [];

  const flushSection = () => {
    if (currentTitle || currentContent.length > 0) {
      const fullText = currentContent.join('\n').trim();
      if (fullText || currentTitle) {
        const lowerTitle = currentTitle.toLowerCase();

        // Lọc bỏ hoàn toàn các mục liên quan đến Chiến lược bán hàng / Cửa sổ bán hàng vàng
        const isCommerceSection =
          lowerTitle.includes('chiến lược') ||
          lowerTitle.includes('thương mại') ||
          lowerTitle.includes('giá bán') ||
          lowerTitle.includes('bảo toàn lợi nhuận') ||
          lowerTitle.includes('cửa sổ') ||
          lowerTitle.includes('golden');

        if (!isCommerceSection) {
          const id = sections.length + 1;
          sections.push({
            id,
            title: currentTitle || 'Nguyên Nhân Dẫn Đến Độ Hao Hụt Cao & Giải Pháp Khắc Phục',
            content: fullText,
            icon: '⚠️',
            badge: 'NGUYÊN NHÂN HAO HỤT CAO & GIẢI PHÁP KHẮC PHỤC',
            borderColor: 'border-amber-300',
            bgColor: 'bg-gradient-to-br from-amber-50/60 via-white to-rose-50/20',
            textColor: 'text-amber-950',
            highlightTag: 'CHẨN ĐOÁN & XỬ LÝ TRỰC DIỆN',
          });
        }
      }
    }
    currentContent = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('###')) {
      flushSection();
      currentTitle = trimmed.replace(/^###\s*/, '').replace(/^[⚠️\d.\s]+/, '').trim();
    } else {
      currentContent.push(line);
    }
  }
  flushSection();

  // Helper render formatted markdown text (bold, list, paragraphs)
  const renderFormattedText = (text: string) => {
    const paragraphs = text.split('\n\n').filter((p) => p.trim() !== '');

    return (
      <div className="space-y-3">
        {paragraphs.map((p, pIdx) => {
          const linesInP = p.split('\n');
          return (
            <div key={pIdx} className="space-y-1.5">
              {linesInP.map((line, lIdx) => {
                const trimmedLine = line.trim();
                const isBullet = trimmedLine.startsWith('-') || trimmedLine.startsWith('*') || trimmedLine.startsWith('•') || trimmedLine.startsWith('+');
                const contentText = isBullet ? trimmedLine.replace(/^[-*•+]\s*/, '') : trimmedLine;

                // Simple parser for **bold** text
                const parts = contentText.split(/(\*\*.*?\*\*)/g);

                return (
                  <div
                    key={lIdx}
                    className={`text-xs leading-relaxed text-slate-800 ${
                      isBullet ? 'flex items-start gap-2 pl-2' : ''
                    }`}
                  >
                    {isBullet && (
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" />
                    )}
                    <span>
                      {parts.map((part, partIdx) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return (
                            <strong key={partIdx} className="font-bold text-slate-950">
                              {part.slice(2, -2)}
                            </strong>
                          );
                        }
                        return part;
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const isHighRisk = riskLevel === 'HIGH' || riskLevel === 'CRITICAL';

  // Lấy nội dung hiển thị: nếu có section nguyên nhân thì lấy, nếu không lấy nội dung full
  const primarySection = sections.length > 0 ? sections[0] : null;

  return (
    <div className="space-y-4">
      {/* Banner Tóm Tắt Định Hướng Kho */}
      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-slate-900 via-amber-950/80 to-slate-900 p-5 text-white shadow-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40 text-lg">
                ⚠️
              </span>
              <h4 className="text-base font-extrabold tracking-tight text-white">
                Chẩn Đoán Rủi Ro Hao Hụt & Giải Pháp Xử Lý Kỹ Thuật
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl pl-10">
              Phân tích các nguyên nhân gốc rễ dẫn đến nguy cơ hao hụt phẩm chất và chỉ đạo giải pháp can thiệp kỹ thuật tức thời cho quản lý kho.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${
              isHighRisk
                ? 'bg-rose-500/20 text-rose-300 ring-rose-400/40 animate-pulse'
                : 'bg-emerald-500/20 text-emerald-300 ring-emerald-400/40'
            }`}>
              {isHighRisk ? '⚡ Cần Can Thiệp Khẩn Cấp' : '🛡️ Kiểm Soát Theo Tiêu Chuẩn'}
            </span>
          </div>
        </div>

        {/* Thanh tóm tắt định hướng nhanh */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-sm">⏳</span>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Thời gian vàng bán hàng:</span>
              <span className="font-bold text-white">
                {safeStorageDays !== null && safeStorageDays !== undefined ? `${safeStorageDays} ngày` : 'Cần đánh giá thêm'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-sm">📉</span>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Rủi ro hao hụt ước tính:</span>
              <span className="font-bold text-white">
                {predictedLossPercent !== null && predictedLossPercent !== undefined ? `${predictedLossPercent.toFixed(1)}% sản lượng` : 'Đang theo dõi'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-teal-400 text-sm">🛡️</span>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Mức độ can thiệp:</span>
              <span className="font-bold text-white">
                {isHighRisk ? 'Khắc phục ngay trong 24h' : 'Duy trì giám sát nhiệt ẩm'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Thẻ Duy Nhất: ⚠️ NGUYÊN NHÂN HAO HỤT CAO & GIẢI PHÁP KHẮC PHỤC */}
      <div className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50/60 via-white to-rose-50/20 p-5 shadow-xs">
        <div className="flex items-start justify-between gap-2 border-b border-amber-200/80 pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-xs text-base border border-amber-200 text-amber-600">
              ⚠️
            </span>
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                NGUYÊN NHÂN HAO HỤT CAO & GIẢI PHÁP KHẮC PHỤC
              </span>
              <h5 className="text-sm font-bold text-amber-950">
                {primarySection?.title || 'Phân Tích Nguyên Nhân & Giải Pháp Can Thiệp Kỹ Thuật'}
              </h5>
            </div>
          </div>

          <span className="hidden sm:inline-flex rounded-full bg-amber-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
            CHẨN ĐOÁN & XỬ LÝ TRỰC DIỆN
          </span>
        </div>

        <div className="pl-1">
          {renderFormattedText(primarySection ? primarySection.content : recommendation)}
        </div>
      </div>
    </div>
  );
};
