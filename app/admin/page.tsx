'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Calendar as CalendarIcon, Info, ArrowLeft, Repeat, Filter, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [halls, setHalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // [1] 뉴질랜드 기준 초기 날짜 설정 (hydration 오류 방지를 위해 초기값은 빈 문자열)
  const [selectedMonth, setSelectedMonth] = useState('');

  const [repeatData, setRepeatData] = useState({
    hallId: '',
    userName: '교회 정기모임',
    userPhone: '관리자',
    purpose: '',
    startDate: '',
    startTime: '',
    endTime: '',
    weeks: 4
  });

  // [2] 데이터를 불러오는 핵심 함수 (useCallback으로 최적화)
  const fetchData = useCallback(async (targetMonth: string) => {
    if (!targetMonth) return;
    setLoading(true);
    
    // 선택된 월의 시작일 (예: 2026-03-01)
    const startDate = `${targetMonth}-01T00:00:00`;
    
    // 다음 달 1일 계산 (필터링 종료 지점)
    const [year, month] = targetMonth.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00`;

    console.log(`조회 시작: ${startDate} ~ ${nextMonthStr} 미만`);

    const { data: bData, error: bError } = await supabase
      .from('bookings')
      .select(`*, halls ( name )`)
      .gte('start_time', startDate)
      .lt('start_time', nextMonthStr) // 종료일 "미만"으로 설정하여 해당 월 전체 포함
      .order('start_time', { ascending: true });

    const { data: hData } = await supabase.from('halls').select('*').order('id', { ascending: true });
    
    if (bError) console.error("데이터 불러오기 오류:", bError);
    if (bData) setBookings(bData);
    if (hData) setHalls(hData);
    setLoading(false);
  }, []);

  // [3] 초기 뉴질랜드 시간 설정 및 데이터 로드
  useEffect(() => {
    const nzNow = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Pacific/Auckland',
      year: 'numeric',
      month: '2-digit'
    }).format(new Date()); 
    
    setSelectedMonth(nzNow);
    fetchData(nzNow);
  }, [fetchData]);

  // [4] 월 변경 핸들러
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMonth = e.target.value;
    setSelectedMonth(newMonth);
    fetchData(newMonth); // 월이 바뀌면 즉시 새로고침
  };

  const handleDelete = async (booking: any) => {
    const isRepeatDelete = confirm(`[${booking.user_name}] 성도님의 예약을 삭제하시겠습니까?\n\n이 예약과 '같은 이름/같은 목적/같은 시간대'인 모든 반복 예약을 함께 지울까요?`);
    if (isRepeatDelete) {
      const targetTime = booking.start_time.split('T')[1].substring(0, 5);
      const { data: targets } = await supabase.from('bookings').select('id, start_time').eq('user_name', booking.user_name).eq('purpose', booking.purpose).eq('hall_id', booking.hall_id);
      const targetIds = targets?.filter(t => t.start_time.includes(targetTime)).map(t => t.id);
      if (targetIds && targetIds.length > 0) {
        const { error } = await supabase.from('bookings').delete().in('id', targetIds);
        if (!error) { alert('삭제 완료'); fetchData(selectedMonth); }
      }
    } else {
      if (confirm('이 한 건만 삭제하시겠습니까?')) {
        const { error } = await supabase.from('bookings').delete().eq('id', booking.id);
        if (!error) { alert('삭제 완료'); fetchData(selectedMonth); }
      }
    }
  };

  const handleRepeatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repeatData.hallId) return alert('홀을 선택하세요.');
    const newBookings = [];
    let currentStartDate = new Date(repeatData.startDate);
    const { data: existing } = await supabase.from('bookings').select('*').eq('hall_id', repeatData.hallId);

    for (let i = 0; i < repeatData.weeks; i++) {
      const dateStr = currentStartDate.toISOString().split('T')[0];
      const startDT = `${dateStr}T${repeatData.startTime}:00`;
      const endDT = `${dateStr}T${repeatData.endTime}:00`;
      if (existing?.some(ex => (startDT < ex.end_time && endDT > ex.start_time))) {
        alert(`${dateStr}에 겹치는 예약이 있습니다.`); return;
      }
      newBookings.push({ hall_id: parseInt(repeatData.hallId), user_name: repeatData.userName, user_phone: repeatData.userPhone, purpose: repeatData.purpose, start_time: startDT, end_time: endDT });
      currentStartDate.setDate(currentStartDate.getDate() + 7);
    }
    const { error } = await supabase.from('bookings').insert(newBookings);
    if (!error) { alert('등록 완료'); fetchData(selectedMonth); }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-10">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <Link href="/" className="p-2 bg-white rounded-full shadow-sm text-slate-800 border border-slate-200"><ArrowLeft size={20} /></Link>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Admin Console</h1>
          <div className="w-10"></div>
        </header>

        {/* 정기 예약 등록 섹션 */}
        <section className="bg-blue-700 p-6 rounded-[2.5rem] shadow-xl mb-10 text-white border-b-8 border-blue-900">
          <div className="flex items-center gap-2 mb-4">
            <Repeat size={20} strokeWidth={3} />
            <h2 className="text-lg font-black italic">REGULAR BOOKING</h2>
          </div>
          <form onSubmit={handleRepeatSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select required className="p-4 rounded-2xl border-none text-slate-900 text-sm font-black w-full" onChange={e => setRepeatData({...repeatData, hallId: e.target.value})}>
                <option value="">홀 선택</option>
                {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <input required type="text" placeholder="사용 목적" className="p-4 rounded-2xl border-none text-slate-900 text-sm font-black w-full" onChange={e => setRepeatData({...repeatData, purpose: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input required type="date" className="p-4 rounded-2xl border-none text-slate-900 text-sm font-black w-full" onChange={e => setRepeatData({...repeatData, startDate: e.target.value})} />
              <input required type="number" placeholder="반복 주 수" className="p-4 rounded-2xl border-none text-slate-900 text-sm font-black w-full" onChange={e => setRepeatData({...repeatData, weeks: parseInt(e.target.value)})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input required type="time" className="p-4 rounded-2xl border-none text-slate-900 text-sm font-black w-full" onChange={e => setRepeatData({...repeatData, startTime: e.target.value})} />
              <input required type="time" className="p-4 rounded-2xl border-none text-slate-900 text-sm font-black w-full" onChange={e => setRepeatData({...repeatData, endTime: e.target.value})} />
            </div>
            <button type="submit" className="w-full py-5 bg-white text-blue-800 rounded-3xl font-black text-lg shadow-lg active:scale-95 transition-transform uppercase">Register Recurring</button>
          </form>
        </section>

        {/* 월별 필터 섹션 */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-slate-800 font-black">
              <Filter size={18} />
              <span>SELECT MONTH</span>
            </div>
            <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">
              {bookings.length} Bookings found
            </span>
          </div>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={handleMonthChange}
            className="w-full p-6 bg-white border-4 border-blue-600 rounded-[2rem] font-black text-slate-900 text-2xl shadow-xl focus:ring-4 focus:ring-blue-100 outline-none transition-all"
          />
        </div>

        {/* 결과 리스트 */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-blue-600">
            <Loader2 className="animate-spin mb-2" size={40} />
            <span className="font-black">FETCHING DATA...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-400 font-black italic">
                No bookings found for {selectedMonth}.
              </div>
            ) : (
              bookings.map((b) => (
                <div key={b.id} className="bg-white p-6 rounded-[2.5rem] shadow-md border-2 border-slate-100 flex items-center justify-between hover:border-blue-200 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black px-2 py-1 bg-blue-100 text-blue-700 rounded-lg uppercase">{b.halls?.name}</span>
                      <span className="text-lg font-black text-slate-900">{b.user_name}</span>
                    </div>
                    <div className="text-sm text-slate-700 font-black flex items-center gap-2">
                      <CalendarIcon size={14} className="text-blue-500" /> 
                      {b.start_time.split('T')[0]} | {b.start_time.split('T')[1].substring(0,5)} - {b.end_time.split('T')[1].substring(0,5)}
                    </div>
                    <div className="text-[13px] text-slate-400 font-bold italic flex items-center gap-1">
                      <Info size={13} /> {b.purpose}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(b)} className="p-5 text-red-500 hover:bg-red-50 rounded-3xl transition-colors">
                    <Trash2 size={24} strokeWidth={2.5} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}