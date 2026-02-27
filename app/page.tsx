'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar as CalendarIcon, Clock, Info, CheckCircle2, AlertCircle } from 'lucide-react';

export default function BookingPage() {
  const [halls, setHalls] = useState<any[]>([]);
  const [selectedHall, setSelectedHall] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // 1. 초기 홀 목록 불러오기
  useEffect(() => {
    const fetchHalls = async () => {
      const { data } = await supabase.from('halls').select('*').order('id', { ascending: true });
      if (data) setHalls(data);
    };
    fetchHalls();
  }, []);

  // 2. [핵심] 선택된 홀과 날짜에 맞는 예약 현황 가져오기
  const fetchCurrentDayBookings = useCallback(async () => {
    if (!selectedHall || !selectedDate) {
      setExistingBookings([]);
      return;
    }

    setLoadingBookings(true);
    // 선택된 날짜의 00:00:00 ~ 23:59:59 범위 설정
    const start = `${selectedDate}T00:00:00`;
    const end = `${selectedDate}T23:59:59`;

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('hall_id', selectedHall)
      .gte('start_time', start)
      .lte('start_time', end)
      .order('start_time', { ascending: true });

    if (error) console.error("현황 로드 실패:", error.message);
    if (data) setExistingBookings(data);
    setLoadingBookings(false);
  }, [selectedHall, selectedDate]);

  // 홀이나 날짜가 바뀔 때마다 실행
  useEffect(() => {
    fetchCurrentDayBookings();
  }, [fetchCurrentDayBookings]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-20 font-sans">
      <div className="max-w-md mx-auto space-y-8">
        
        <header className="py-6 text-center">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Church Booking</h1>
          <p className="text-slate-500 font-bold">성전 및 홀 예약 시스템</p>
        </header>

        {/* 예약 입력 섹션 */}
        <section className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2 ml-2">SELECT HALL</label>
              <select 
                value={selectedHall}
                onChange={(e) => setSelectedHall(e.target.value)}
                className="w-full p-5 bg-slate-50 border-none rounded-3xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
              >
                <option value="">홀을 선택해주세요</option>
                {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 mb-2 ml-2">SELECT DATE</label>
              <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-5 bg-slate-50 border-none rounded-3xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>
        </section>

        {/* 3. [추가됨] 실시간 예약 현황 섹션 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Clock size={16} className="text-blue-600" />
              실시간 예약 현황
            </h2>
            {selectedDate && (
              <span className="text-[10px] font-black bg-white px-3 py-1 rounded-full border border-slate-200 text-slate-500 uppercase">
                {selectedDate}
              </span>
            )}
          </div>

          {!selectedHall || !selectedDate ? (
            <div className="bg-blue-50 p-8 rounded-[2rem] border-2 border-dashed border-blue-200 text-center">
              <p className="text-blue-400 font-black text-sm italic">홀과 날짜를 선택하시면<br/>예약 현황을 확인할 수 있습니다.</p>
            </div>
          ) : loadingBookings ? (
            <div className="text-center p-10 animate-pulse font-black text-slate-300 uppercase">Checking schedule...</div>
          ) : existingBookings.length === 0 ? (
            <div className="bg-green-50 p-8 rounded-[2rem] border-2 border-green-100 text-center flex flex-col items-center gap-2">
              <CheckCircle2 className="text-green-500" size={32} />
              <p className="text-green-700 font-black text-sm uppercase">No Bookings! 빈 시간입니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {existingBookings.map((b) => (
                <div key={b.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="bg-blue-600 text-white p-3 rounded-2xl font-black text-xs text-center min-w-[70px]">
                    {b.start_time.split('T')[1].substring(0, 5)}
                  </div>
                  <div>
                    <div className="text-slate-900 font-black text-sm">{b.user_name} 성도님</div>
                    <div className="text-slate-400 font-bold text-[11px] flex items-center gap-1">
                      <Info size={10} /> {b.purpose}
                    </div>
                  </div>
                </div>
              ))}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-2">
                <AlertCircle className="text-amber-500 shrink-0" size={16} />
                <p className="text-[11px] text-amber-700 font-bold leading-tight">
                  위 시간대를 피해서 예약 신청을 진행해주세요. 겹치는 시간은 등록이 되지 않습니다.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* 여기에 기존의 '예약 신청 버튼'과 '입력 폼'이 계속 이어지면 됩니다. */}
      </div>
    </main>
  );
}