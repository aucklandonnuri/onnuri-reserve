'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Calendar as CalendarIcon, Info, ArrowLeft, Repeat, Filter } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [halls, setHalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // [추가] 뉴질랜드 기준 현재 연-월 초기값 설정
  const nzNow = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Auckland',
    year: 'numeric',
    month: '2-digit'
  }).format(new Date()); // 결과 예시: "2026-02"

  const [selectedMonth, setSelectedMonth] = useState(nzNow);

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

  // [수정] 월별 필터링이 적용된 데이터 불러오기
  const fetchData = async () => {
    setLoading(true);
    
    // 선택된 월의 시작일과 마지막일 계산
    const startDate = `${selectedMonth}-01T00:00:00`;
    const [year, month] = selectedMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${selectedMonth}-${lastDay}T23:59:59`;

    const { data: bData } = await supabase
      .from('bookings')
      .select(`*, halls ( name )`)
      .gte('start_time', startDate)
      .lte('start_time', endDate)
      .order('start_time', { ascending: true });

    const { data: hData } = await supabase.from('halls').select('*').order('id', { ascending: true });
    
    if (bData) setBookings(bData);
    if (hData) setHalls(hData);
    setLoading(false);
  };

  // selectedMonth가 바뀔 때마다 다시 fetch
  useEffect(() => { fetchData(); }, [selectedMonth]);

  const handleDelete = async (booking: any) => {
    const isRepeatDelete = confirm(
      `[${booking.user_name}] 성도님의 예약을 삭제합니다.\n\n이 예약과 '같은 이름/같은 목적/같은 시간대'인 모든 예약을 지울까요?`
    );

    if (isRepeatDelete) {
      const targetTime = booking.start_time.split('T')[1].substring(0, 5);
      const { data: targets } = await supabase
        .from('bookings')
        .select('id, start_time')
        .eq('user_name', booking.user_name)
        .eq('purpose', booking.purpose)
        .eq('hall_id', booking.hall_id);

      const targetIds = targets
        ?.filter(t => t.start_time.includes(targetTime))
        .map(t => t.id);

      if (targetIds && targetIds.length > 0) {
        const { error } = await supabase.from('bookings').delete().in('id', targetIds);
        if (!error) {
          alert(`${targetIds.length}건의 반복 예약이 모두 삭제되었습니다.`);
          fetchData();
        }
      }
    } else {
      if (confirm('이 예약 한 건만 삭제하시겠습니까?')) {
        const { error } = await supabase.from('bookings').delete().eq('id', booking.id);
        if (!error) { alert('삭제되었습니다.'); fetchData(); }
      }
    }
  };

  const handleRepeatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repeatData.hallId) return alert('홀을 선택해주세요.');

    const newBookings = [];
    let currentStartDate = new Date(repeatData.startDate);
    const { data: existing } = await supabase.from('bookings').select('*').eq('hall_id', repeatData.hallId);

    for (let i = 0; i < repeatData.weeks; i++) {
      const dateStr = currentStartDate.toISOString().split('T')[0];
      const startDT = `${dateStr}T${repeatData.startTime}:00`;
      const endDT = `${dateStr}T${repeatData.endTime}:00`;

      const isOverlap = existing?.some(ex => (startDT < ex.end_time && endDT > ex.start_time));
      
      if (isOverlap) {
        alert(`${dateStr} 날짜에 이미 겹치는 예약이 있어 일괄 등록을 중단합니다.`);
        return;
      }

      newBookings.push({
        hall_id: parseInt(repeatData.hallId),
        user_name: repeatData.userName,
        user_phone: repeatData.userPhone,
        purpose: repeatData.purpose,
        start_time: startDT,
        end_time: endDT,
      });
      currentStartDate.setDate(currentStartDate.getDate() + 7);
    }

    const { error } = await supabase.from('bookings').insert(newBookings);
    if (!error) {
      alert('정기 예약이 성공적으로 등록되었습니다.');
      fetchData();
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-10 font-sans">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <Link href="/" className="p-2 bg-white rounded-full shadow-sm text-slate-800 border border-slate-200">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-black text-slate-900 uppercase">Admin Management</h1>
          <div className="w-10"></div>
        </header>

        {/* 정기 예약 등록 폼 */}
        <section className="bg-blue-700 p-6 rounded-[2.5rem] shadow-xl mb-10 text-white border-b-8 border-blue-900">
          <div className="flex items-center gap-2 mb-4">
            <Repeat size={20} strokeWidth={3} />
            <h2 className="text-lg font-black italic">REGULAR BOOKING</h2>
          </div>
          <form onSubmit={handleRepeatSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select required className="p-4 rounded-2xl border-none text-slate-900 text-sm font-black w-full outline-none shadow-inner"
                onChange={e => setRepeatData({...repeatData, hallId: e.target.value})}>
                <option value="">홀 선택</option>
                {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <input required type="text" placeholder="사용 목적" className="p-4 rounded-2xl border-none text-slate-900 text-sm font-black w-full outline-none shadow-inner"
                onChange={e => setRepeatData({...repeatData, purpose: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input required type="date" className="p-4 rounded-2xl border-none text-slate-900 text-sm font-black outline-none shadow-inner"
                onChange={e => setRepeatData({...repeatData, startDate: e.target.value})} />
              <input required type="number" placeholder="반복 주 수" className="p-4 rounded-2xl border-none text-slate-900 text-sm font-black outline-none shadow-inner"
                onChange={e => setRepeatData({...repeatData, weeks: parseInt(e.target.value)})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input required type="time" className="p-4 rounded-2xl border-none text-slate-900 text-sm font-black outline-none shadow-inner"
                onChange={e => setRepeatData({...repeatData, startTime: e.target.value})} />
              <input required type="time" className="p-4 rounded-2xl border-none text-slate-900 text-sm font-black outline-none shadow-inner"
                onChange={e => setRepeatData({...repeatData, endTime: e.target.value})} />
            </div>
            <button type="submit" className="w-full py-5 bg-white text-blue-800 rounded-3xl font-black text-lg shadow-lg mt-2 active:scale-95 transition-transform uppercase tracking-tighter">
              Verify & Add Recurring
            </button>
          </form>
        </section>

        {/* 월별 필터 UI */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-slate-800 font-black">
              <Filter size={18} />
              <span>MONTHLY FILTER</span>
            </div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total {bookings.length} Found</span>
          </div>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full p-5 bg-white border-2 border-slate-200 rounded-[2rem] font-black text-slate-900 text-lg shadow-sm focus:border-blue-600 outline-none transition-all"
          />
        </div>

        {loading ? (
          <div className="text-center py-20 font-black text-slate-300 animate-pulse">FETCHING DATA...</div>
        ) : (
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-400 font-black italic">
                No bookings found for this month.
              </div>
            ) : (
              bookings.map((b) => (
                <div key={b.id} className="bg-white p-6 rounded-[2rem] shadow-md border-2 border-slate-100 flex items-center justify-between active:scale-[0.98] transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black px-2 py-1 bg-blue-100 text-blue-700 rounded-lg uppercase tracking-tighter">
                        {b.halls?.name}
                      </span>
                      <span className="text-lg font-black text-slate-900">{b.user_name}</span>
                    </div>
                    <div className="text-sm text-slate-700 font-black flex items-center gap-2">
                      <CalendarIcon size={14} className="text-blue-500" /> 
                      {b.start_time.split('T')[0]} | 
                      {b.start_time.split('T')[1].substring(0,5)} - {b.end_time.split('T')[1].substring(0,5)}
                    </div>
                    <div className="text-[13px] text-slate-400 font-bold flex items-center gap-1 italic">
                      <Info size={13} /> {b.purpose}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(b)}
                    className="p-5 text-red-500 hover:bg-red-50 rounded-3xl transition-colors border-2 border-transparent hover:border-red-100"
                  >
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