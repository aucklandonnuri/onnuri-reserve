'use client'; // 절대 주석 처리 금지!

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar as CalendarIcon, Clock, Info, CheckCircle2, AlertCircle, User, Phone, Send } from 'lucide-react';

export default function BookingPage() {
  const [halls, setHalls] = useState<any[]>([]);
  const [selectedHall, setSelectedHall] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const [formData, setFormData] = useState({
    userName: '', userPhone: '', purpose: '', startTime: '', endTime: ''
  });

  useEffect(() => {
    const fetchHalls = async () => {
      const { data } = await supabase.from('halls').select('*').order('id', { ascending: true });
      if (data) setHalls(data);
    };
    fetchHalls();
  }, []);

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

  useEffect(() => { fetchCurrentDayBookings(); }, [fetchCurrentDayBookings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHall || !selectedDate) return alert('홀과 날짜 선택 필수');
    const startDT = `${selectedDate}T${formData.startTime}:00`;
    const endDT = `${selectedDate}T${formData.endTime}:00`;
    if (startDT >= endDT) return alert('시간 설정 오류');
    if (existingBookings.some(ex => (startDT < ex.end_time && endDT > ex.start_time))) return alert('시간 중복');

    const { error } = await supabase.from('bookings').insert([{
      hall_id: parseInt(selectedHall), user_name: formData.userName, user_phone: formData.userPhone,
      purpose: formData.purpose, start_time: startDT, end_time: endDT
    }]);

    if (!error) {
      alert('예약 완료!');
      setFormData({ ...formData, startTime: '', endTime: '', purpose: '' });
      fetchCurrentDayBookings();
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-20 font-sans text-slate-900">
      <div className="max-w-md mx-auto space-y-6">
        <header className="py-8 text-center">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic text-blue-700">CHURCH BOOKING</h1>
        </header>

        {/* STEP 1: 날짜/홀 선택 */}
        <section className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 space-y-4">
          <select value={selectedHall} onChange={e => setSelectedHall(e.target.value)} className="w-full p-5 bg-slate-100 rounded-3xl font-black outline-none">
            <option value="">홀 선택</option>
            {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-5 bg-slate-100 rounded-3xl font-black outline-none" />
        </section>

        {/* STEP 2: 현황판 (사용 목적 메인 디자인) */}
        {(selectedHall && selectedDate) && (
          <section className="space-y-3">
            <h2 className="text-xs font-black text-slate-500 px-2 uppercase flex items-center gap-2"><Clock size={14}/> Current Schedule</h2>
            <div className="grid gap-2">
              {existingBookings.length === 0 ? (
                <div className="bg-green-50 p-6 rounded-[2rem] text-center font-black text-green-700 text-xs uppercase">No Bookings</div>
              ) : (
                existingBookings.map((b) => (
                  <div key={b.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-600 text-white px-3 py-1.5 rounded-xl font-black text-[10px]">
                        {b.start_time.split('T')[1].substring(0, 5)} - {b.end_time.split('T')[1].substring(0, 5)}
                      </div>
                      {/* ⭐ 여기가 핵심: 사용 목적을 굵게 표시 */}
                      <div className="text-slate-900 font-black text-[15px]">{b.purpose}</div>
                    </div>
                    {/* ⭐ 예약자 성함은 우측에 작게 표시 */}
                    <div className="text-slate-400 font-bold text-[11px] italic">{b.user_name}</div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* STEP 3: 신청 폼 */}
        {(selectedHall && selectedDate) && (
          <form onSubmit={handleSubmit} className="bg-blue-600 p-8 rounded-[3rem] shadow-2xl text-white space-y-4">
            <div className="flex items-center gap-2 mb-2 font-black italic"><Send size={18} /> REQUEST</div>
            <input required type="text" placeholder="예약자 성함" value={formData.userName} onChange={e => setFormData({...formData, userName: e.target.value})} className="w-full p-4 bg-blue-700 rounded-2xl font-black outline-none" />
            <input required type="text" placeholder="연락처" value={formData.userPhone} onChange={e => setFormData({...formData, userPhone: e.target.value})} className="w-full p-4 bg-blue-700 rounded-2xl font-black outline-none" />
            <input required type="text" placeholder="사용 목적 (예: 찬양 연습)" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} className="w-full p-4 bg-blue-700 rounded-2xl font-black outline-none" />
            <div className="grid grid-cols-2 gap-3">
              <input required type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full p-4 bg-blue-700 rounded-2xl font-black outline-none" />
              <input required type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full p-4 bg-blue-700 rounded-2xl font-black outline-none" />
            </div>
            <button type="submit" className="w-full py-6 bg-white text-blue-700 rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition-all">신청 완료하기</button>
          </form>
        )}
      </div>
    </main>
  );
}