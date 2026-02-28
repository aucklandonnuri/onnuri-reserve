'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Calendar as CalendarIcon, ArrowLeft, Repeat, Filter, Loader2, ChevronLeft, ChevronRight, Bookmark, Phone, CheckSquare, CalendarDays } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [halls, setHalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');

  // 반복 예약 설정 상태
  const [repeatType, setRepeatType] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([]); // 매월 반복용 (1,2,3,4,5주)
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

  const handleDelete = async (booking: any) => {
    const isRepeatDelete = confirm("반복 예약을 모두 지울까요?");
    if (isRepeatDelete) {
      const targetTime = booking.start_time.split('T')[1].substring(0, 5);
      const { data: targets } = await supabase.from('bookings').select('id, start_time').eq('user_name', booking.user_name).eq('purpose', booking.purpose).eq('hall_id', booking.hall_id);
      const targetIds = targets?.filter(t => t.start_time.includes(targetTime)).map(t => t.id);
      if (targetIds) {
        await supabase.from('bookings').delete().in('id', targetIds);
        fetchData(selectedMonth);
      }
    } else if (confirm('이 건만 삭제할까요?')) {
      await supabase.from('bookings').delete().eq('id', booking.id);
      fetchData(selectedMonth);
    }
  };

  const handleRepeatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repeatData.hallId || !repeatData.startDate) return alert('홀과 시작날짜 선택 필수');
    
    const newBookings = [];
    const baseDate = new Date(repeatData.startDate);
    const dayOfWeek = baseDate.getDay(); // 시작 날짜의 요일 (0:일, 1:월...)

    if (repeatType === 'weekly') {
      // 기존 방식: 주 단위 반복
      let current = new Date(baseDate);
      for (let i = 0; i < repeatData.weeksCount; i++) {
        const dateStr = current.toISOString().split('T')[0];
        newBookings.push({
          hall_id: parseInt(repeatData.hallId), user_name: repeatData.userName, user_phone: repeatData.userPhone,
          purpose: repeatData.purpose, start_time: `${dateStr}T${repeatData.startTime}:00`, end_time: `${dateStr}T${repeatData.endTime}:00`
        });
        current.setDate(current.getDate() + 7);
      }
    } else {
      // 새로운 방식: 매월 특정 주차 반복 (6개월치 자동 생성)
      if (selectedWeeks.length === 0) return alert('반복할 주차를 선택해주세요.');
      
      for (let m = 0; m < 6; m++) { // 향후 6개월치 생성
        const targetMonthDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + m, 1);
        const year = targetMonthDate.getFullYear();
        const month = targetMonthDate.getMonth();

        selectedWeeks.forEach(weekNum => {
          // 해당 월의 n번째 요일 찾기
          let count = 0;
          for (let d = 1; d <= 31; d++) {
            const tempDate = new Date(year, month, d);
            if (tempDate.getMonth() !== month) break;
            if (tempDate.getDay() === dayOfWeek) {
              count++;
              if (count === weekNum) {
                const dateStr = tempDate.toISOString().split('T')[0];
                newBookings.push({
                  hall_id: parseInt(repeatData.hallId), user_name: repeatData.userName, user_phone: repeatData.userPhone,
                  purpose: repeatData.purpose, start_time: `${dateStr}T${repeatData.startTime}:00`, end_time: `${dateStr}T${repeatData.endTime}:00`
                });
              }
            }
          }
        });
      }
    }

    const { error } = await supabase.from('bookings').insert(newBookings);
    if (!error) {
      alert(`${newBookings.length}건의 예약이 등록되었습니다.`);
      fetchData(selectedMonth);
    } else {
      alert('등록 중 오류가 발생했습니다.');
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
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Admin Center</h1>
          <div className="w-10"></div>
        </header>

        {/* 1. 정기 예약 폼 */}
        <section className="bg-blue-700 p-6 rounded-[2.5rem] shadow-xl mb-10 text-white border-b-8 border-blue-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-black italic"><Repeat size={20}/> REGULAR BOOKING</div>
            <div className="flex bg-blue-800 rounded-xl p-1 text-[10px] font-black">
              <button onClick={() => setRepeatType('weekly')} className={`px-3 py-1.5 rounded-lg transition-colors ${repeatType === 'weekly' ? 'bg-white text-blue-800' : 'text-blue-300'}`}>매주</button>
              <button onClick={() => setRepeatType('monthly')} className={`px-3 py-1.5 rounded-lg transition-colors ${repeatType === 'monthly' ? 'bg-white text-blue-800' : 'text-blue-300'}`}>매월 주차</button>
            </div>
          </div>

          <form onSubmit={handleRepeatSubmit} className="space-y-3">
            <input required type="text" placeholder="사용 목적 (예: 찬양대 연습)" className="w-full p-4 rounded-2xl font-black outline-none bg-blue-50 border-2 border-blue-300 text-slate-900 focus:bg-white transition-colors" onChange={e => setRepeatData({...repeatData, purpose: e.target.value})} />
            
            <div className="grid grid-cols-2 gap-2 text-slate-900">
              <select required className="p-4 rounded-2xl font-black outline-none" onChange={e => setRepeatData({...repeatData, hallId: e.target.value})}>
                <option value="">홀 선택</option>
                {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <input type="text" placeholder="예약자명" value={repeatData.userName} className="p-4 rounded-2xl font-black outline-none" onChange={e => setRepeatData({...repeatData, userName: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-900">
              <div className="space-y-1">
                <span className="text-[10px] ml-2 text-blue-200 font-bold uppercase tracking-widest">시작 기준일 (요일 결정)</span>
                <input required type="date" className="w-full p-4 rounded-2xl font-black outline-none" onChange={e => setRepeatData({...repeatData, startDate: e.target.value})} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] ml-2 text-blue-200 font-bold uppercase tracking-widest">{repeatType === 'weekly' ? '반복 횟수(주)' : '반복 옵션'}</span>
                {repeatType === 'weekly' ? (
                  <input type="number" placeholder="총 몇 주간?" value={repeatData.weeksCount} className="w-full p-4 rounded-2xl font-black outline-none" onChange={e => setRepeatData({...repeatData, weeksCount: parseInt(e.target.value)})} />
                ) : (
                  <div className="flex gap-1 h-[56px]">
                    {[1, 2, 3, 4, 5].map(w => (
                      <button key={w} type="button" onClick={() => toggleWeek(w)} className={`flex-1 rounded-xl font-black text-xs transition-all ${selectedWeeks.includes(w) ? 'bg-white text-blue-800 scale-95 shadow-inner' : 'bg-blue-800 text-blue-300'}`}>{w}주</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-900">
              <input required type="time" className="p-4 rounded-2xl font-black outline-none" onChange={e => setRepeatData({...repeatData, startTime: e.target.value})} />
              <input required type="time" className="p-4 rounded-2xl font-black outline-none" onChange={e => setRepeatData({...repeatData, endTime: e.target.value})} />
            </div>

            <button type="submit" className="w-full py-5 bg-white text-blue-800 rounded-3xl font-black text-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
              <CalendarDays size={20}/> {repeatType === 'weekly' ? '주 단위 일괄 등록' : '월 주차별 일괄 등록 (6개월)'}
            </button>
          </form>
        </section>

        {/* 2. 월 선택 및 리스트는 이전과 동일 */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between px-2 font-black text-slate-800">
            <div className="flex items-center gap-2"><Filter size={18} /> SELECT MONTH</div>
            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{bookings.length} Bookings</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => changeMonth(-1)} className="p-5 bg-white border-2 border-slate-200 rounded-3xl shadow-sm active:scale-90 transition-all"><ChevronLeft size={28} className="text-slate-600" /></button>
            <div className="relative flex-1">
              <input type="month" value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); fetchData(e.target.value); }} onClick={(e) => e.currentTarget.showPicker?.()}
                className="w-full p-5 bg-white border-4 border-blue-600 rounded-[2rem] font-black text-slate-900 text-2xl shadow-xl text-center outline-none cursor-pointer" />
            </div>
            <button onClick={() => changeMonth(1)} className="p-5 bg-white border-2 border-slate-200 rounded-3xl shadow-sm active:scale-90 transition-all"><ChevronRight size={28} className="text-slate-600" /></button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-blue-600 font-black animate-pulse"><Loader2 size={40} className="mx-auto animate-spin mb-2"/>LOADING...</div>
        ) : (
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed text-slate-400 font-black italic">{selectedMonth} 예약 없음</div>
            ) : (
              bookings.map((b) => (
                <div key={b.id} className="bg-white p-6 rounded-[2.2rem] shadow-sm border-2 border-slate-100 flex items-center justify-between hover:border-blue-200 transition-colors">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black px-2 py-0.5 bg-slate-800 text-white rounded-md uppercase tracking-wider">{b.halls?.name}</span>
                      <span className="text-xs font-bold text-slate-400">{b.user_name} <Phone size={10} className="inline ml-1" />{b.user_phone}</span>
                    </div>
                    <div className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-tight"><Bookmark size={18} className="text-blue-600 fill-blue-600" />{b.purpose}</div>
                    <div className="text-sm text-slate-600 font-bold flex items-center gap-2 bg-slate-50 w-fit px-3 py-1 rounded-full"><CalendarIcon size={14} className="text-blue-500" /> {b.start_time.split('T')[0]} | <span className="text-blue-700">{b.start_time.split('T')[1].substring(0,5)} - {b.end_time.split('T')[1].substring(0,5)}</span></div>
                  </div>
                  <button onClick={() => handleDelete(b)} className="p-4 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={24} /></button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}