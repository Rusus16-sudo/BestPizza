const fs = require('fs');

const content = fs.readFileSync('transcript_matches.txt', 'utf8');
const lines = content.split('\n');
let longestCss = '';

for (const line of lines) {
  try {
    const parsed = JSON.parse(line);
    
    // Look at arguments of tool calls
    if (parsed.tool_calls) {
      for (const tc of parsed.tool_calls) {
        if (tc.args && tc.args.TargetFile && tc.args.TargetFile.includes('Admin.module.css')) {
          if (tc.args.CodeContent && tc.args.CodeContent.length > longestCss.length) {
            longestCss = tc.args.CodeContent;
          }
        }
      }
    }
  } catch (e) {
    // some lines might not be valid JSON if they were truncated or something
  }
}

if (longestCss) {
  fs.writeFileSync('src/app/admin/Admin.module.css', longestCss);
  console.log('Restored Admin.module.css successfully! Length:', longestCss.length);
} else {
  console.log('Could not find full CSS content in matches.');
}
