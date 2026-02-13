'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react';

function ReserveContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
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
    
    // 1. [시간 역전 방지] 시작 시각이 종료 시각보다 늦은지 즉시 체크
    const startValue = formData.startTime.replace(':', '');
    const endValue = formData.endTime.replace(':', '');

    if (parseInt(startValue) >= parseInt(endValue)) {
      alert('❌ 마침 시간은 시작 시간보다 이후여야 합니다.');
      return;
    }

    if (!hallId) return alert('홀 정보가 없습니다.');

    // 2. [중복 체크] 현재 날짜의 해당 홀 예약을 모두 가져옴
    const { data: existing, error: fetchError } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('hall_id', parseInt(hallId))
      .gte('start_time', `${formData.date}T00:00:00`)
      .lte('start_time', `${formData.date}T23:59:59`);

    if (fetchError) {
      alert('데이터 확인 중 오류가 발생했습니다.');
      return;
    }

    // 새 예약 시간 (비교를 위해 초 단위까지 포함한 문자열 생성)
    const newStart = `${formData.date}T${formData.startTime}:00`;
    const newEnd = `${formData.date}T${formData.endTime}:00`;

    // 3. [엄격한 겹침 검사] (새 시작 < 기존 종료) AND (새 종료 > 기존 시작)
    const isOverlapping = existing?.some(b => {
      // DB의 타임존(+00) 등을 무시하고 앞쪽 19자리(YYYY-MM-DDTHH:mm:ss)만 따서 비교
      const exStart = b.start_time.substring(0, 19);
      const exEnd = b.end_time.substring(0, 19);
      
      return (newStart < exEnd && newEnd > exStart);
    });

    if (isOverlapping) {
      alert('⚠️ 해당 시간에는 이미 다른 예약이 있습니다. 현황판을 다시 확인해 주세요.');
      return;
    }

    // 4. 저장 진행
    const { error } = await supabase.from('bookings').insert([{
      hall_id: parseInt(hallId),
      user_name: formData.userName,
      user_phone: formData.userPhone,
      purpose: formData.purpose,
      start_time: newStart,
      end_time: newEnd,
    }]);

    if (!error) {
      alert(`${hallName} 예약이 완료되었습니다!`);
      router.push('/');
      router.refresh();
    } else {
      alert('저장 실패: ' + error.message);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-md">
        <button onClick={() => router.push('/')} className="mb-6 flex items-center gap-2 text-slate-500 font-bold">
          <ArrowLeft size={20} /> 현황판으로 가기
        </button>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
          <h2 className="text-2xl font-black text-slate-800 mb-6 text-center">
            <span className="text-blue-600">{hallName}</span> 예약하기
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <input required type="text" placeholder="예약자 성함" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" 
              onChange={e => setFormData({...formData, userName: e.target.value})} />
            
            <input required type="tel" placeholder="연락처" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" 
              onChange={e => setFormData({...formData, userPhone: e.target.value})} />
            
            <input required type="text" placeholder="사용 목적" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" 
              onChange={e => setFormData({...formData, purpose: e.target.value})} />

            <div className="pt-4 space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400 ml-1">예약 날짜</span>
                <input required type="date" value={formData.date} className="w-full p-4 bg-slate-50 border-none rounded-xl font-bold" 
                  onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 ml-1">시작 시간</span>
                  <input required type="time" className="w-full p-4 bg-slate-50 border-none rounded-xl font-bold" 
                    onChange={e => setFormData({...formData, startTime: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 ml-1">마침 시간</span>
                  <input required type="time" className="w-full p-4 bg-slate-50 border-none rounded-xl font-bold" 
                    onChange={e => setFormData({...formData, endTime: e.target.value})} />
                </div>
              </div>
            </div>

            <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xl shadow-lg mt-6 active:scale-95 transition-all">
              예약 신청하기
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function ReservePage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-bold">로딩 중...</div>}>
      <ReserveContent />
    </Suspense>
  );
}