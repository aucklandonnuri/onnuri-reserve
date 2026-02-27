'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar as CalendarIcon, Clock, Info, CheckCircle2, AlertCircle, User, Phone, Send } from 'lucide-react';

export default function BookingPage() {
  const [halls, setHalls] = useState<any[]>([]);
  const [selectedHall, setSelectedHall] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // 예약 신청을 위한 입력 상태
  const [formData, setFormData] = useState({
    userName: '',
    userPhone: '',
    purpose: '',
    startTime: '',
    endTime: ''
  });

  // 1. 초기 홀 목록 불러오기
  useEffect(() => {
    const fetchHalls = async () => {
      const { data } = await supabase.from('halls').select('*').order('id', { ascending: true });
      if (data) setHalls(data);
    };
    fetchHalls();
  }, []);

  // 2. 실시간 예약 현황 가져오기
  const fetchCurrentDayBookings = useCallback(async () => {
    if (!selectedHall || !selectedDate) {
      setExistingBookings([]);
      return;
    }
    setLoadingBookings(true);
    const start = `${selectedDate}T00:00:00`;
    const end = `${selectedDate}T23:59:59`;

    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('hall_id', selectedHall)
      .gte('start_time', start)
      .lte('start_time', end)
      .order('start_time', { ascending: true });

    if (data) setExistingBookings(data);
    setLoadingBookings(false);
  }, [selectedHall, selectedDate]);

  useEffect(() => {
    fetchCurrentDayBookings();
  }, [fetchCurrentDayBookings]);

  // 3. 예약 신청 제출 함수
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHall || !selectedDate) return alert('홀과 날짜를 선택해주세요.');

    const startDT = `${selectedDate}T${formData.startTime}:00`;
    const endDT = `${selectedDate}T${formData.endTime}:00`;

    if (startDT >= endDT) return alert('종료 시간은 시작 시간보다 늦어야 합니다.');

    // 중복 시간 체크 (클라이언트 측 검사)
    const isOverlap = existingBookings.some(ex => (startDT < ex.end_time && endDT > ex.start_time));
    if (isOverlap) return alert('선택하신 시간에 이미 예약이 있습니다. 현황을 다시 확인해주세요.');

    const { error } = await supabase.from('bookings').insert([{
      hall_id: parseInt(selectedHall),
      user_name: formData.userName,
      user_phone: formData.userPhone,
      purpose: formData.purpose,
      start_time: startDT,
      end_time: endDT
    }]);

    if (!error) {
      alert('예약이 성공적으로 신청되었습니다!');
      setFormData({ ...formData, startTime: '', endTime: '', purpose: '' }); // 폼 초기화
      fetchCurrentDayBookings(); // 목록 갱신
    } else {
      alert('오류가 발생했습니다: ' + error.message);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-20 font-sans text-slate-900">
      <div className="max-w-md mx-auto space-y-6">
        
        <header className="py-8 text-center">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic text-blue-700">CHURCH BOOKING</h1>
          <p className="text-slate-400 font-bold text-sm mt-1 uppercase tracking-widest">Reserve Your Space</p>
        </header>

        {/* STEP 1: 홀 및 날짜 선택 */}
        <section className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 space-y-4">
          <div className="flex items-center gap-2 mb-2 ml-1 text-blue-600 font-black text-xs uppercase">
            <CalendarIcon size={14} /> Step 1. Select Date & Hall
          </div>
          <select 
            required
            value={selectedHall}
            onChange={(e) => setSelectedHall(e.target.value)}
            className="w-full p-5 bg-slate-100 border-none rounded-3xl font-black text-lg outline-none focus:ring-4 focus:ring-blue-100 transition-all"
          >
            <option value="">홀(장소) 선택</option>
            {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>

          <input 
            required
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-5 bg-slate-100 border-none rounded-3xl font-black text-lg outline-none focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </section>

        {/* STEP 2: 예약 현황 확인 (사용자가 선택한 후 나타남) */}
        {(selectedHall && selectedDate) && (
          <section className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xs font-black text-slate-500 flex items-center gap-2 uppercase tracking-tight">
                <Clock size={14} /> Current Schedule
              </h2>
            </div>

            {loadingBookings ? (
              <div className="text-center p-8 font-black text-slate-300 animate-pulse">LOADING...</div>
            ) : existingBookings.length === 0 ? (
              <div className="bg-green-50 p-6 rounded-[2rem] border-2 border-green-100 text-center flex flex-col items-center gap-1">
                <CheckCircle2 className="text-green-500" size={24} />
                <p className="text-green-700 font-black text-xs uppercase tracking-tight">모든 시간대가 비어있습니다</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {existingBookings.map((b) => (
                  <div key={b.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-600 text-white px-3 py-1.5 rounded-xl font-black text-[10px]">
                        {b.start_time.split('T')[1].substring(0, 5)} - {b.end_time.split('T')[1].substring(0, 5)}
                      </div>
                      <div className="text-slate-900 font-black text-sm">{b.user_name}</div>
                    </div>
                    <div className="text-slate-400 font-bold text-[10px] italic">{b.purpose}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* STEP 3: 예약 신청 양식 (홀과 날짜가 선택되어야 나타남) */}
        {(selectedHall && selectedDate) && (
          <form onSubmit={handleSubmit} className="bg-blue-600 p-8 rounded-[3rem] shadow-2xl text-white space-y-4 animate-in zoom-in-95 duration-500">
            <div className="flex items-center gap-2 mb-2 font-black italic">
              <Send size={18} /> REQUEST BOOKING
            </div>

            <div className="space-y-3">
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" />
                <input required type="text" placeholder="예약자 성함" 
                  value={formData.userName} onChange={e => setFormData({...formData, userName: e.target.value})}
                  className="w-full p-4 pl-12 bg-blue-700 border-none rounded-2xl font-black text-white placeholder:text-blue-300 outline-none focus:ring-2 focus:ring-white/30 transition-all" />
              </div>

              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" />
                <input required type="text" placeholder="연락처" 
                  value={formData.userPhone} onChange={e => setFormData({...formData, userPhone: e.target.value})}
                  className="w-full p-4 pl-12 bg-blue-700 border-none rounded-2xl font-black text-white placeholder:text-blue-300 outline-none focus:ring-2 focus:ring-white/30 transition-all" />
              </div>

              <div className="relative">
                <Info size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" />
                <input required type="text" placeholder="사용 목적 (예: 청년부 연습)" 
                  value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})}
                  className="w-full p-4 pl-12 bg-blue-700 border-none rounded-2xl font-black text-white placeholder:text-blue-300 outline-none focus:ring-2 focus:ring-white/30 transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-blue-200 mb-1 ml-1 uppercase">Start Time</label>
                  <input required type="time" 
                    value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})}
                    className="w-full p-4 bg-blue-700 border-none rounded-2xl font-black text-white outline-none focus:ring-2 focus:ring-white/30 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-blue-200 mb-1 ml-1 uppercase">End Time</label>
                  <input required type="time" 
                    value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})}
                    className="w-full p-4 bg-blue-700 border-none rounded-2xl font-black text-white outline-none focus:ring-2 focus:ring-white/30 transition-all" />
                </div>
              </div>
            </div>

            <button type="submit" className="w-full py-6 bg-white text-blue-700 rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition-all hover:bg-slate-50 uppercase tracking-tighter mt-4">
              신청 완료하기
            </button>
            <p className="text-[10px] text-blue-200 text-center font-bold italic">
              * 기존 예약과 겹치는 시간은 자동으로 신청이 반려됩니다.
            </p>
          </form>
        )}

      </div>
    </main>
  );
}