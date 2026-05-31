import ReactMarkdown from 'react-markdown';

export default function MarkdownRenderer({ content }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none
      prose-headings:text-slate-200 prose-headings:font-semibold prose-headings:mb-2
      prose-p:text-slate-300 prose-p:leading-relaxed prose-p:my-1.5
      prose-strong:text-slate-100 prose-strong:font-semibold
      prose-ul:text-slate-300 prose-ul:my-1.5 prose-ul:pl-4
      prose-ol:text-slate-300 prose-ol:my-1.5
      prose-li:text-slate-300 prose-li:my-0.5
      prose-code:text-orange-400 prose-code:bg-white/5 prose-code:px-1 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-[#0a0a0f] prose-pre:border prose-pre:border-white/10 prose-pre:rounded-lg
      prose-table:text-sm prose-th:text-slate-400 prose-th:font-medium prose-td:text-slate-300
      prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
      prose-hr:border-white/10">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
