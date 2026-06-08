import Icon, { type IconName } from './Icon';

export type TabName = 'chat' | 'pronounce' | 'translate' | 'write';

interface TabDef {
  id: TabName;
  label: string;
  icon: IconName;
}

const TABS: TabDef[] = [
  { id: 'chat', label: 'Chat', icon: 'chat' },
  { id: 'pronounce', label: 'Pronounce', icon: 'wave' },
  { id: 'translate', label: 'Translate', icon: 'lang' },
  { id: 'write', label: 'Write', icon: 'pen' },
];

interface TabBarProps {
  active: TabName;
  onChange: (tab: TabName) => void;
  enabled: Record<TabName, boolean>;
}

export default function TabBar({ active, onChange, enabled }: TabBarProps) {
  return (
    <nav className="scroll flex-none overflow-x-auto border-b border-slate-200 bg-white px-3 sm:px-7" style={{ zIndex: 15 }}>
      <div className="mx-auto flex w-max min-w-full max-w-[1180px] gap-1">
        {TABS.map((tab) =>
          enabled[tab.id] ? (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={
                '-mb-px inline-flex items-center gap-2 border-b-[2.5px] px-[18px] pb-4 pt-3.5 text-[14.5px] font-semibold transition-colors ' +
                (active === tab.id
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900')
              }
            >
              <Icon name={tab.icon} size={18} /> {tab.label}
            </button>
          ) : (
            <div
              key={tab.id}
              className="tip -mb-px inline-flex cursor-not-allowed items-center gap-2 border-b-[2.5px] border-transparent px-[18px] pb-4 pt-3.5 text-[14.5px] font-semibold text-slate-400"
              data-tip="Coming soon"
              aria-disabled="true"
            >
              <Icon name={tab.icon} size={18} /> {tab.label}
              <Icon name="lock" size={13} className="-ml-0.5 opacity-70" />
            </div>
          ),
        )}
      </div>
    </nav>
  );
}
