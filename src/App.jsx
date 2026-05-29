import { useState } from 'react'
import './App.css'

function App() {
  const [events, setEvents] = useState([])
  const [newEvent, setNewEvent] = useState({ title: '', date: '', category: '', description: '' })
  const [categories, setCategories] = useState(['工作', '個人', '會議'])
  const [newCategory, setNewCategory] = useState('')
  const [currentDate, setCurrentDate] = useState(new Date()) // 追蹤目前顯示的月份

  // 請將下方字串替換為你實際部署的 Google Apps Script URL
  const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby6woWZnZTMDZJzBEubxcfu5y6NJeyDVd8QDjMA-0urNp37ftROyCLySHkBa2L25mmAKA/exec';

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.date) return
    setEvents([...events, newEvent])
    setNewEvent({ title: '', date: '', category: categories[0] || '', description: '' })
  }

  const handleAddCategory = () => {
    if (!newCategory || categories.includes(newCategory)) return
    setCategories([...categories, newCategory])
    setNewCategory('')
  }

  const handleDeleteEvent = (indexToDelete) => {
    setEvents(events.filter((_, idx) => idx !== indexToDelete))
  }

  const exportICS = () => {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//My Calendar App//EN\n";
    
    events.forEach(event => {
      const dateStr = event.date.replace(/-/g, '')
      icsContent += "BEGIN:VEVENT\n";
      icsContent += `DTSTART:${dateStr}T000000Z\n`;
      icsContent += `DTEND:${dateStr}T235959Z\n`;
      icsContent += `SUMMARY:${event.title}\n`;
      icsContent += `DESCRIPTION:${event.description || ''}\n`;
      icsContent += `CATEGORIES:${event.category || ''}\n`;
      icsContent += "END:VEVENT\n";
    })
    
    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'calendar.ics'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const importICS = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target.result
      const lines = content.split(/\r?\n/)
      const parsedEvents = []
      let currentEvent = null

      lines.forEach(line => {
        if (line.startsWith('BEGIN:VEVENT')) {
          currentEvent = {}
        } else if (line.startsWith('END:VEVENT')) {
          if (currentEvent) parsedEvents.push(currentEvent)
          currentEvent = null
        } else if (currentEvent) {
          if (line.startsWith('SUMMARY:')) currentEvent.title = line.substring(8).trim()
          if (line.startsWith('DTSTART:')) {
            const d = line.substring(8, 16)
            if (d.length === 8) {
              currentEvent.date = `${d.substring(0,4)}-${d.substring(4,6)}-${d.substring(6,8)}`
            }
          }
          if (line.startsWith('DESCRIPTION:')) currentEvent.description = line.substring(12).trim()
          if (line.startsWith('CATEGORIES:')) currentEvent.category = line.substring(11).trim()
        }
      })
      
      setEvents([...events, ...parsedEvents])
    }
    reader.readAsText(file)
  }

  const syncToGoogleSheets = async () => {
    if (!GOOGLE_APPS_SCRIPT_URL || GOOGLE_APPS_SCRIPT_URL === '請在這裡填入你的_Google_Apps_Script_URL') {
      alert("請先在程式碼中設定 GOOGLE_APPS_SCRIPT_URL")
      return
    }
    try {
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        // 使用 text/plain 可以避免觸發 Apps Script 不支援的 CORS OPTIONS 預檢請求
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ events })
      })
      const result = await response.json()
      if (result.status === 'success') {
        alert("成功同步到 Google Sheets!")
      } else {
        alert("同步失敗: " + result.message)
      }
    } catch (error) {
      alert("發生錯誤: " + error.message)
    }
  }

  // 月曆渲染邏輯
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
  const dayNames = ["日", "一", "二", "三", "四", "五", "六"];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // 點擊日期自動帶入新增事項的日期
  const handleDayClick = (day) => {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    setNewEvent({ ...newEvent, date: `${year}-${formattedMonth}-${formattedDay}` });
  }

  // 取得分類的獨特顏色
  const getCategoryColor = (cat) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F06292', '#BA68C8'];
    const idx = categories.indexOf(cat);
    return colors[idx % colors.length] || '#A0A0A0';
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", backgroundColor: '#F4F7F6', color: '#333' }}>
      
      {/* 左側控制面板 */}
      <aside style={{ width: '320px', backgroundColor: '#FFFFFF', padding: '20px', boxShadow: '2px 0 10px rgba(0,0,0,0.05)', overflowY: 'auto' }}>
        <h2 style={{ marginTop: 0, color: '#2C3E50', borderBottom: '2px solid #ECF0F1', paddingBottom: '10px' }}>📆 規劃你的生活</h2>
        
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ fontSize: '1rem', color: '#7F8C8D' }}>新增事項</h3>
          <input 
            type="text" 
            value={newEvent.title} 
            onChange={e => setNewEvent({...newEvent, title: e.target.value})} 
            placeholder="事項標題" 
            style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #BDC3C7', boxSizing: 'border-box' }}
          />
          <input 
            type="date" 
            value={newEvent.date} 
            onChange={e => setNewEvent({...newEvent, date: e.target.value})} 
            style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #BDC3C7', boxSizing: 'border-box' }}
          />
          <select 
            value={newEvent.category} 
            onChange={e => setNewEvent({...newEvent, category: e.target.value})}
            style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #BDC3C7', boxSizing: 'border-box' }}
          >
            <option value="">選擇分類</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea 
            type="text" 
            value={newEvent.description} 
            onChange={e => setNewEvent({...newEvent, description: e.target.value})} 
            placeholder="描述 (選填)" 
            style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #BDC3C7', boxSizing: 'border-box', minHeight: '60px' }}
          />
          <button onClick={handleAddEvent} style={{ width: '100%', padding: '10px', backgroundColor: '#3498DB', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>+ 新增至行事曆</button>
        </div>

        <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#F8F9F9', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#7F8C8D', marginTop: 0 }}>自訂分類</h3>
          <div style={{ display: 'flex', gap: '5px' }}>
            <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="新分類" style={{ flexGrow: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <button onClick={handleAddCategory} style={{ padding: '8px 12px', backgroundColor: '#2ECC71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>新增</button>
          </div>
        </div>

        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#7F8C8D' }}>檔案與同步</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'block', padding: '8px', backgroundColor: '#ECF0F1', textAlign: 'center', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
              📂 匯入 .ics 檔案
              <input type="file" accept=".ics" onChange={importICS} style={{ display: 'none' }} />
            </label>
            <button onClick={exportICS} style={{ padding: '8px', backgroundColor: '#ECF0F1', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>💾 匯出 .ics 檔案</button>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '0.9rem', color: '#7F8C8D' }}>雲端備份 (Google Sheets)</h3>
          <button onClick={syncToGoogleSheets} style={{ width: '100%', padding: '8px', backgroundColor: '#F1C40F', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>☁️ 開始同步</button>
        </div>
      </aside>

      {/* 右側月曆主體 */}
      <main style={{ flexGrow: 1, padding: '30px', display: 'flex', flexDirection: 'column' }}>
        {/* 月曆標題與切換 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 10px' }}>
          <button onClick={prevMonth} style={{ padding: '10px 15px', fontSize: '1.2rem', cursor: 'pointer', border: 'none', backgroundColor: '#FFF', borderRadius: '50%', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>{"<"}</button>
          <h1 style={{ margin: 0, fontSize: '2rem', color: '#2C3E50' }}>{year} 年 {monthNames[month]}</h1>
          <button onClick={nextMonth} style={{ padding: '10px 15px', fontSize: '1.2rem', cursor: 'pointer', border: 'none', backgroundColor: '#FFF', borderRadius: '50%', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>{">"}</button>
        </div>

        {/* 月曆網格 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', flexGrow: 1 }}>
          {/* 星期標題 */}
          {dayNames.map(day => (
            <div key={day} style={{ textAlign: 'center', fontWeight: 'bold', color: '#7F8C8D', padding: '10px 0' }}>{day}</div>
          ))}
          
          {/* 空白填充 (該月第一天之前的空格) */}
          {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
            <div key={`empty-${idx}`} style={{ backgroundColor: 'transparent' }}></div>
          ))}

          {/* 日期格子 */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const day = idx + 1;
            const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date === cellDateStr);

            return (
              <div 
                key={day} 
                onClick={() => handleDayClick(day)}
                style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '10px', minHeight: '100px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'transform 0.2s', borderTop: '4px solid #ECF0F1' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ fontWeight: 'bold', color: '#34495E', marginBottom: '8px' }}>{day}</div>
                
                {/* 顯示當日事件 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {dayEvents.map((ev, evIdx) => (
                    <div key={evIdx} style={{ backgroundColor: getCategoryColor(ev.category), color: 'white', padding: '4px 6px', borderRadius: '4px', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', position: 'relative', display: 'flex', justifyContent: 'space-between' }}>
                      <span title={ev.description}>{ev.title}</span>
                      <span onClick={(e) => { e.stopPropagation(); handleDeleteEvent(events.indexOf(ev)); }} style={{ cursor: 'pointer', paddingLeft: '4px', fontWeight: 'bold' }}>×</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}

export default App
