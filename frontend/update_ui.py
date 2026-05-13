import sys

file_path = r'd:\Community Chat room\The Main Project\football-chat-platform\frontend\src\components\CommunityRoom.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Insert import
for i, line in enumerate(lines):
    if "import AppHeader from './AppHeader';" in line:
        lines.insert(i + 1, "import ClubNews from './ClubNews';\n")
        break

# Insert tab UI
for i, line in enumerate(lines):
    if ">MATCH STATS<" in line.replace(" ", ""):
        for j in range(i, i+10):
            if "</button>" in lines[j]:
                new_button = """            <button
              className={`tab-btn ${activeTab === 'news' ? 'active' : ''}`}
              onClick={() => setActiveTab('news')}
            >
              CLUB NEWS
            </button>\n"""
                lines.insert(j + 1, new_button)
                break
        break

# Insert tab content
for i, line in enumerate(lines):
    if "{activeTab === 'stats' && (" in line:
        new_content = """          {activeTab === 'news' && (
            <div className="h-full overflow-hidden flex flex-col">
              <ClubNews clubName={community?.club_name || community?.name} />
            </div>
          )}\n\n"""
        lines.insert(i, new_content)
        break

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Updated UI successfully!')
