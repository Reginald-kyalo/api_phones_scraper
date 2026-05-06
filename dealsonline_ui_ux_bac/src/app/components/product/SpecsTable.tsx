interface SpecsTableProps {
  specifications: Record<string, string>;
}

/** Known spec category prefixes → group name mapping */
const SPEC_GROUPS: [string[], string][] = [
  [['display', 'screen', 'resolution', 'refresh', 'brightness', 'panel'], 'Display'],
  [['processor', 'cpu', 'chipset', 'gpu', 'cores', 'clock'], 'Performance'],
  [['ram', 'memory', 'storage', 'rom', 'expandable'], 'Memory & Storage'],
  [['battery', 'charging', 'power', 'adapter'], 'Battery'],
  [['camera', 'megapixel', 'lens', 'aperture', 'zoom', 'video', 'selfie', 'rear', 'front'], 'Camera'],
  [['weight', 'dimension', 'height', 'width', 'thickness', 'depth', 'size'], 'Dimensions'],
  [['os', 'operating', 'android', 'ios', 'software', 'version'], 'Software'],
  [['wifi', 'bluetooth', 'nfc', 'usb', '5g', '4g', 'lte', 'sim', 'network', 'connectivity', 'port'], 'Connectivity'],
  [['color', 'colour', 'material', 'build', 'body', 'protection', 'water', 'ip6', 'ip5'], 'Design'],
];

function groupSpecifications(specs: Record<string, string>): Record<string, Record<string, string>> {
  const groups: Record<string, Record<string, string>> = {};
  const used = new Set<string>();

  for (const [prefixes, groupName] of SPEC_GROUPS) {
    const matches: Record<string, string> = {};
    for (const [key, value] of Object.entries(specs)) {
      if (used.has(key)) continue;
      const lower = key.toLowerCase();
      if (prefixes.some((p) => lower.includes(p))) {
        matches[key] = value;
        used.add(key);
      }
    }
    if (Object.keys(matches).length > 0) {
      groups[groupName] = matches;
    }
  }

  // Remaining ungrouped specs
  const other: Record<string, string> = {};
  for (const [key, value] of Object.entries(specs)) {
    if (!used.has(key)) other[key] = value;
  }
  if (Object.keys(other).length > 0) {
    groups['General'] = other;
  }

  return groups;
}

export default function SpecsTable({ specifications }: SpecsTableProps) {
  const entries = Object.entries(specifications);

  if (entries.length === 0) {
    return (
      <div className="text-center py-10 bg-gray-50 rounded-lg border border-border">
        <p className="text-sm text-muted-foreground">Specifications not yet available.</p>
      </div>
    );
  }

  const grouped = groupSpecifications(specifications);
  const groupEntries = Object.entries(grouped);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {groupEntries.map(([groupName, specs]) => (
        <div key={groupName} className="border border-border rounded-lg overflow-hidden">
          <div className="bg-[var(--surface-alt)] px-4 py-2.5 border-b border-border">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">{groupName}</h4>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(specs).map(([key, value], i) => (
                <tr
                  key={key}
                  className={i % 2 === 0 ? 'bg-white' : 'bg-[var(--surface-alt)]'}
                >
                  <td className="px-4 py-2.5 text-muted-foreground font-medium w-[45%] align-top">
                    {key}
                  </td>
                  <td className="px-4 py-2.5 text-foreground">
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
