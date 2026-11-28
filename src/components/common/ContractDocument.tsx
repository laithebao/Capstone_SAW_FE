/** Present only the stored text. Never rebuild a historical snapshot from master data. */
export default function ContractDocument({ content }: { content: string }) {
  const lines = content.split(/\r?\n/)
  return <article style={{ fontFamily: '"Times New Roman", serif' }} className="contract-document mx-auto w-full max-w-4xl rounded-xl border border-slate-200 bg-white px-6 py-8 text-[15px] leading-7 text-slate-800 shadow-sm sm:px-10 sm:py-10">
    {lines.map((line, index) => {
      const value = line.trim()
      if (!value) return <div key={index} className="h-3" aria-hidden="true" />
      if (value.startsWith('CỘNG HÒA')) return <p key={index} className="text-center font-bold tracking-wide">{line}</p>
      if (value.startsWith('Độc lập')) return <p key={index} className="mx-auto mb-5 w-fit border-b border-slate-300 pb-2 text-center">{line}</p>
      if (value.startsWith('HỢP ĐỒNG THU MUA')) return <h2 key={index} className="mb-3 mt-6 text-center text-xl font-bold leading-8 sm:text-2xl">{line}</h2>
      if (/^(Số:|Ngày gửi:)/.test(value)) return <p key={index} className="text-center text-sm text-slate-600">{line}</p>
      if (/^(BÊN [AB]|Điều \d+\.)/.test(value)) return <h3 key={index} className="mb-2 mt-5 font-bold text-slate-950">{line}</h3>
      return <p key={index} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{line}</p>
    })}
  </article>
}
