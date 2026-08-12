const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:\\Users\\PROBOOK MT 43\\.gemini\\antigravity-ide\\brain\\e1a9ff88-013f-4fdd-a495-687fc2eb5148\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let latestCss = null;

  for await (const line of rl) {
    if (line.includes('Admin.module.css') && line.includes('CodeContent')) {
      try {
        const parsed = JSON.parse(line);
        // Navigate through the parsed JSON to find the CodeContent of Admin.module.css
        // It's usually inside tool_calls -> args -> CodeContent
        if (parsed.tool_calls) {
          for (const tc of parsed.tool_calls) {
            if (tc.args && tc.args.TargetFile && tc.args.TargetFile.includes('Admin.module.css') && tc.args.CodeContent) {
              latestCss = tc.args.CodeContent;
            }
          }
        }
      } catch(e) {}
    }
  }

  if (latestCss) {
    fs.writeFileSync('src/app/admin/Admin.module.css', latestCss);
    console.log('Restored Admin.module.css from transcript!');
  } else {
    console.log('Could not find CSS in transcript.');
  }
}

processLineByLine();
