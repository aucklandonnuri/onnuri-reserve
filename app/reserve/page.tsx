'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react';

function ReserveContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 1. URL에서 정보 가져오기
  const hallId = searchParams.get('hallId');
  const hallName = searchParams.get('hallName');
  const dateFromUrl = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    userName: '',
    userPhone: '',
    purpose: '',
    date: dateFromUrl,
    startTime: '',
    endTime: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 시작과 종료 시간 설정
    const startDateTime = `${formData.date}T${formData.startTime}:00`;
    const endDateTime = `${formData.date}T${formData.endTime}:00`;

    // 2. 중복 예약 확인 (더 엄격한 필터링)
    // 현재 날짜의 시작(00:00)부터 끝(23:59)까지의 예약 중 해당 홀의 예약만 가져옴
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('hall_id', hallId)
      .gte('start_time', `${formData.date}T00:00:00`)
      .lte('start_time', `${formData.date}T23:59:59`);

    // 가져온 예약들 중 시간이 실제로 겹치는지 체크
    const isOverlapping = existingBookings?.some(booking => {
      return (startDateTime < booking.end_time && endDateTime > booking.start_time);
    });

    if (isOverlapping) {
      alert('죄송합니다. 해당 시간에는 이미 다른 예약이 있습니다. 현황판을 확인 후 다른 시간을 선택해주세요.');
      return;
    }

    // 3. 데이터 저장
    const { error } = await supabase.from('bookings').insert([{
      hall_id: parseInt(hallId || '0'),
      user_name: formData.userName,
      user_phone: formData.userPhone,
      purpose: formData.purpose,
      start_time: startDateTime,
      end_time: endDateTime,
    }]);

    if (!error) {
      alert(`${hallName} 예약이 완료되었습니다!`);
      router.push('/');
    } else {
      alert('에러가 발생했습니다: ' + error.message);
    }
  };

  return (
    <main className="min-h-screen bg-white p-6">
      <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-slate-500">
        <ArrowLeft size={20} /> 뒤로가기
      </button>

      <h2 className="text-2xl font-bold text-slate-800 mb-2">
        <span className="text-blue-600">{hallName || '홀'}</span> 예약하기
      </h2>
      <p className="text-slate-500 mb-8 text-sm">정보를 입력하여 예약을 완료해주세요.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">예약자 성함</label>
          <input required type="text" 
            className="w-full p-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 font-bold" 
            placeholder="성함을 입력하세요"
            onChange={e => setFormData({...formData, userName: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">연락처</label>
          <input required type="tel" 
            className="w-full p-4 bg-slate-50 border-none rounded-xl text-slate-900 font-bold" 
            placeholder="010-0000-0000"
            onChange={e => setFormData({...formData, userPhone: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">사용 목적</label>
          <input required type="text" 
            className="w-full p-4 bg-slate-50 border-none rounded-xl text-slate-900 font-bold" 
            placeholder="예: 주일학교 모임"
            onChange={e => setFormData({...formData, purpose: e.target.value})} />
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">날짜</label>
            <input required type="date" 
              value={formData.date} 
              className="w-full p-4 bg-slate-50 border-none rounded-xl text-slate-900 font-bold" 
              onChange={e => setFormData({...formData, date: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 ml-1 font-bold uppercase">Start Time</label>
              <input required type="time" className="w-full p-4 bg-slate-50 border-none rounded-xl text-slate-900 font-bold" 
                onChange={e => setFormData({...formData, startTime: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 ml-1 font-bold uppercase">End Time</label>
              <input required type="time" className="w-full p-4 bg-slate-50 border-none rounded-xl text-slate-900 font-bold" 
                onChange={e => setFormData({...formData, endTime: e.target.value})} />
            </div>
          </div>
        </div>

        <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg mt-4 text-lg active:scale-95 transition-transform">
          예약 신청하기
        </button>
      </form>
    </main>
  );
}

export default function ReservePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-500 font-bold">데이터를 불러오는 중입니다...</div>}>
      <ReserveContent />
    </Suspense>
  );
}