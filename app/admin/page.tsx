'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Calendar as CalendarIcon, ArrowLeft, Repeat, Filter, Loader2, ChevronLeft, ChevronRight, Bookmark, Phone, CalendarDays } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [halls, setHalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');

  const [repeatType, setRepeatType] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([]);
  const [repeatData, setRepeatData] = useState({
    hallId: '', userName: '교회 정기모임', userPhone: '관리자', purpose: '', startDate: '', startTime: '', endTime: '', weeksCount: 4
  });

  const fetchData = useCallback(async (targetMonth: string) => {
    if (!targetMonth) return;
    setLoading(true);
    const startDate = `${targetMonth}-01T00:00:00`;
    const [year, month] = targetMonth.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00`;

    const { data: bData } = await supabase.from('bookings').select(`*, halls ( name )`).gte('start_time', startDate).lt('start_time', nextMonthStr).order('start_time', { ascending: true });
    const { data: hData } = await supabase.from('halls').select('*').order('id', { ascending: true });
    
    if (bData) setBookings(bData);
    if (hData) setHalls(hData);
    setLoading(false);
  }, []);

  useEffect(() => {
    const nzNow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit' }).format(new Date()); 
    setSelectedMonth(nzNow);
    fetchData(nzNow);
  }, [fetchData]);

  const changeMonth = (offset: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
    fetchData(newMonth);
  };

  // ⭐ 일괄 삭제 로직 복구 및 강화
  const handleDelete = async (booking: any) => {
    const isRepeatDelete = confirm(
      "'확인'을 누르면 관련된 반복 일정을 모두 삭제합니다.\n'취소'를 누르면 선택한 이 건만 삭제합니다."
    );

    if (isRepeatDelete) {
      const targetTime = booking.start_time.split('T')[1]; 

      const { data: targets } = await supabase
        .from('bookings')
        .select('id')
        .eq('hall_id', booking.hall_id)
        .eq('user_name', booking.user_name)
        .eq('purpose', booking.purpose)
        .like('start_time', `%${targetTime}`);

      if (targets && targets.length > 0) {
        const targetIds = targets.map(t => t.id);
        const { error } = await supabase.from('bookings').delete().in('id', targetIds);
        if (!error) alert(`총 ${targetIds.length}건의 반복 예약을 삭제했습니다.`);
      }
    } else {
      if (confirm('이 건만 삭제하시겠습니까?')) {
        const { error } = await supabase.from('bookings').delete().eq('id', booking.id);
        if (!error) alert('삭제되었습니다.');
      }
    }
    fetchData(selectedMonth);
  };

  // ⭐ 서버 시간대 오류를 원천 차단하는 등록 로직
  const handleRepeatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repeatData.hallId || !repeatData.startDate) return alert('홀과 시작날짜 선택 필수');
    
    const newBookings = [];
    const [sYear, sMonth, sDay] = repeatData.startDate.split('-').map(Number);
    const baseDate = new Date(sYear, sMonth - 1, sDay); 
    const dayOfWeek = baseDate.getDay(); 

    if (repeatType === 'weekly') {
      let current = new Date(sYear, sMonth - 1, sDay);
      for (let i = 0; i < repeatData.weeksCount; i++) {
        const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
        newBookings.push({
          hall_id: parseInt(repeatData.hallId), 
          user_name: repeatData.userName, 
          user_phone: repeatData.userPhone,
          purpose: repeatData.purpose, 
          start_time: `${dateStr}T${repeatData.startTime}:00`, 
          end_time: `${dateStr}T${repeatData.endTime}:00`
        });
        current.setDate(current.getDate() + 7);
      }
    } else {
      if (selectedWeeks.length === 0) return alert('반복할 주차를 선택해주세요.');
      
      for (let m = 0; m < 6; m++) {
        const year = sYear + Math.floor((sMonth - 1 + m) / 12);
        const month = (sMonth - 1 + m) % 12;

        let count = 0;
        for (let d = 1; d <= 31; d++) {
          const tempDate = new Date(year, month, d);
          if (tempDate.getMonth() !== month) break;
          
          if (tempDate.getDay() === dayOfWeek) {
            count++;
            if (selectedWeeks.includes(count)) {
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              newBookings.push({
                hall_id: parseInt(repeatData.hallId), 
                user_name: repeatData.userName, 
                user_phone: repeatData.userPhone,
                purpose: repeatData.purpose, 
                start_time: `${dateStr}T${repeatData.startTime}:00`, 
                end_time: `${dateStr}T${repeatData.endTime}:00`
              });
            }
          }
        }
      }
    }

    const { error } = await supabase.from('bookings').insert(newBookings);
    if (!error) {
      alert(`${newBookings.length}건의 예약이 등록되었습니다.`);
      fetchData(selectedMonth);
    } else {
      alert('오류 발생: ' + error.message);
    }
  };

  const toggleWeek = (w: number) => {
    setSelectedWeeks(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-10 font-sans">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <Link href="/" className="p-2 bg-white rounded-full shadow-sm border border-slate-200"><ArrowLeft size={20} /></Link>
          <h1 className="text-xl font-black text-slate-900 uppercase">Admin Center</h1>
          <div className="w-10"></div>
        </header>

        <section className="bg-blue-700 p-6 rounded-[2.5rem] shadow-xl mb-10 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-black italic"><Repeat size={20}/> REGULAR</div>
            <div className="flex bg-blue-800 rounded-xl p-1 text-[10px] font-black">
              <button onClick={() => setRepeatType('weekly')} className={`px-3 py-1.5 rounded-lg ${repeatType === 'weekly' ? 'bg-white text-blue-800' : 'text-blue-300'}`}>매주</button>
              <button onClick={() => setRepeatType('monthly')} className={`px-3 py-1.5 rounded-lg ${repeatType === 'monthly' ? 'bg-white text-blue-800' : 'text-blue-300'}`}>매월 주차</button>
            </div>
          </div>
          <form onSubmit={handleRepeatSubmit} className="space-y-3">
            <input required type="text" placeholder="사용 목적" className="w-full p-4 rounded-2xl font-black bg-white text-slate-900 outline-none" onChange={e => setRepeatData({...repeatData, purpose: e.target.value})} />
            <div className="grid grid-cols-2 gap-2 text-slate-900">
              <select required className="p-4 rounded-2xl font-black outline-none" onChange={e => setRepeatData({...repeatData, hallId: e.target.value})}>
                <option value="">홀 선택</option>
                {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <input type="text" placeholder="예약자명" value={repeatData.userName} className="p-4 rounded-2xl font-black outline-none" onChange={e => setRepeatData({...repeatData, userName: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-900">
              <input required type="date" className="p-4 rounded-2xl font-black outline-none" onChange={e => setRepeatData({...repeatData, startDate: e.target.value})} />
              {repeatType === 'weekly' ? (
                <input type="number" placeholder="반복 횟수(주)" className="p-4 rounded-2xl font-black outline-none" onChange={e => setRepeatData({...repeatData, weeksCount: parseInt(e.target.value)})} />
              ) : (
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(w => (
                    <button key={w} type="button" onClick={() => toggleWeek(w)} className={`flex-1 rounded-xl font-black text-[10px] ${selectedWeeks.includes(w) ? 'bg-white text-blue-800' : 'bg-blue-800 text-blue-300'}`}>{w}주</button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-900">
              <input required type="time" className="p-4 rounded-2xl font-black outline-none" onChange={e => setRepeatData({...repeatData, startTime: e.target.value})} />
              <input required type="time" className="p-4 rounded-2xl font-black outline-none" onChange={e => setRepeatData({...repeatData, endTime: e.target.value})} />
            </div>
            <button type="submit" className="w-full py-5 bg-white text-blue-800 rounded-3xl font-black text-lg shadow-lg active:scale-95 transition-transform">
               <CalendarDays className="inline mr-2" size={20}/> 일괄 등록 실행
            </button>
          </form>
        </section>

        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => changeMonth(-1)} className="p-4 bg-white border rounded-2xl"><ChevronLeft/></button>
          <input type="month" value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); fetchData(e.target.value); }} className="flex-1 p-4 bg-white border-4 border-blue-600 rounded-2xl font-black text-center" />
          <button onClick={() => changeMonth(1)} className="p-4 bg-white border rounded-2xl"><ChevronRight/></button>
        </div>

        {loading ? <div className="text-center font-black animate-pulse">LOADING...</div> : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="bg-white p-5 rounded-[2rem] shadow-sm border-2 border-slate-100 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black px-2 py-0.5 bg-slate-800 text-white rounded-md uppercase">{b.halls?.name}</span>
                    <span className="text-[10px] font-bold text-slate-400">{b.user_name}</span>
                  </div>
                  <div className="text-lg font-black text-slate-900 flex items-center gap-2 mb-1"><Bookmark size={16} className="text-blue-600" />{b.purpose}</div>
                  <div className="text-xs text-slate-600 font-bold flex items-center gap-2">
                    <CalendarIcon size={12} className="text-blue-500" /> 
                    {b.start_time.split('T')[0]} | <span className="text-blue-700">{b.start_time.split('T')[1].substring(0,5)} - {b.end_time.split('T')[1].substring(0,5)}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(b)} className="p-3 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={20} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}