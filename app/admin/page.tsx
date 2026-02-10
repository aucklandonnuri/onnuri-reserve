'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Calendar as CalendarIcon, Info, ArrowLeft, Repeat, AlertCircle } from 'lucide-react';
import Link from 'next/link';

// ... (인터페이스 정의 동일)

export default function AdminPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [halls, setHalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const fetchData = async () => {
    setLoading(true);
    const { data: bData } = await supabase
      .from('bookings')
      .select(`*, halls ( name )`)
      .order('start_time', { ascending: true });
    const { data: hData } = await supabase.from('halls').select('*').order('id', { ascending: true });
    if (bData) setBookings(bData);
    if (hData) setHalls(hData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // 1. 일괄 삭제 로직 수정 (더 확실한 ID 기반 삭제)
  const handleDelete = async (booking: any) => {
    const isRepeatDelete = confirm(
      `[${booking.user_name}] 성도님의 예약을 삭제합니다.\n\n이 예약과 '같은 이름/같은 목적/같은 시간대'인 모든 예약을 지울까요?`
    );

    if (isRepeatDelete) {
      // 시간 추출 (예: 10:00)
      const targetTime = booking.start_time.split('T')[1].substring(0, 5);
      
      // 삭제 대상 먼저 조회 (안전하게)
      const { data: targets } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_name', booking.user_name)
        .eq('purpose', booking.purpose)
        .eq('hall_id', booking.hall_id);

      // 시간대가 일치하는 ID만 필터링
      const targetIds = targets
        ?.filter(t => bookings.find(b => b.id === t.id)?.start_time.includes(targetTime))
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

  // 2. 반복 등록 시 중복 체크 로직 추가
  const handleRepeatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repeatData.hallId) return alert('홀을 선택해주세요.');

    const newBookings = [];
    let currentStartDate = new Date(repeatData.startDate);
    
    // 중복 체크를 위해 기존 예약 가져오기
    const { data: existing } = await supabase.from('bookings').select('*').eq('hall_id', repeatData.hallId);

    for (let i = 0; i < repeatData.weeks; i++) {
      const dateStr = currentStartDate.toISOString().split('T')[0];
      const startDT = `${dateStr}T${repeatData.startTime}:00`;
      const endDT = `${dateStr}T${repeatData.endTime}:00`;

      // 겹치는 시간이 있는지 미리 검사
      const isOverlap = existing?.some(ex => (startDT < ex.end_time && endDT > ex.start_time));
      
      if (isOverlap) {
        alert(`${dateStr} 날짜에 이미 겹치는 예약이 있어 일괄 등록을 중단합니다. 해당 날짜 확인 후 다시 시도해 주세요.`);
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
    } else {
      alert('등록 중 오류 발생: ' + error.message);
    }
  };

  // ... (아래 렌더링 UI 부분은 이전과 동일하되 디자인 소폭 개선)
  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-10">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <Link href="/" className="p-2 bg-white rounded-full shadow-sm text-slate-400">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-slate-800">예약 통합 관리자</h1>
          <div className="w-10"></div>
        </header>

        {/* 정기 예약 등록 폼 (기존과 동일) */}
        <section className="bg-blue-600 p-6 rounded-[2.5rem] shadow-lg mb-10 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Repeat size={20} strokeWidth={3} />
            <h2 className="text-lg font-black">정기 예약 일괄 등록 (중복 자동체크)</h2>
          </div>
          
          <form onSubmit={handleRepeatSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select required className="p-3 rounded-xl border-none text-slate-800 text-sm font-bold w-full"
                onChange={e => setRepeatData({...repeatData, hallId: e.target.value})}>
                <option value="">홀 선택</option>
                {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <input required type="text" placeholder="사용 목적 (예: 주일예배)" className="p-3 rounded-xl border-none text-slate-800 text-sm font-bold w-full"
                onChange={e => setRepeatData({...repeatData, purpose: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input required type="date" className="p-3 rounded-xl border-none text-slate-800 text-sm font-bold"
                onChange={e => setRepeatData({...repeatData, startDate: e.target.value})} />
              <input required type="number" placeholder="반복 주 수" className="p-3 rounded-xl border-none text-slate-800 text-sm font-bold"
                onChange={e => setRepeatData({...repeatData, weeks: parseInt(e.target.value)})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input required type="time" className="p-3 rounded-xl border-none text-slate-800 text-sm font-bold"
                onChange={e => setRepeatData({...repeatData, startTime: e.target.value})} />
              <input required type="time" className="p-3 rounded-xl border-none text-slate-800 text-sm font-bold"
                onChange={e => setRepeatData({...repeatData, endTime: e.target.value})} />
            </div>
            <button type="submit" className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black text-md shadow-inner mt-2 active:scale-95 transition-transform">
              중복 체크 후 등록하기
            </button>
          </form>
        </section>

        {/* 예약 리스트 */}
        <div className="mb-4 flex items-center justify-between px-2 text-slate-500 font-bold text-sm">
          <span>가까운 일정 순서</span>
          <span>총 {bookings.length}건</span>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400">데이터를 불러오는 중...</div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div key={b.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md">
                      {b.halls?.name}
                    </span>
                    <span className="text-base font-black text-slate-800">{b.user_name}</span>
                  </div>
                  <div className="text-sm text-slate-600 font-bold flex items-center gap-1">
                    <CalendarIcon size={14} className="text-slate-400" /> 
                    {b.start_time.split('T')[0]} | 
                    {b.start_time.split('T')[1].substring(0,5)} ~ {b.end_time.split('T')[1].substring(0,5)}
                  </div>
                  <div className="text-sm text-slate-400 font-medium flex items-center gap-1">
                    <Info size={14} /> {b.purpose}
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(b)}
                  className="p-4 text-red-400 hover:bg-red-50 rounded-2xl transition-colors"
                >
                  <Trash2 size={24} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}