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
    
    // 1. [시간 역전 방지] 숫자로 변환하여 비교
    const startNum = parseInt(formData.startTime.replace(':', ''));
    const endNum = parseInt(formData.endTime.replace(':', ''));

    if (startNum >= endNum) {
      alert('❌ 마침 시간은 시작 시간보다 이후여야 합니다.');
      return;
    }

    if (!hallId) return alert('홀 정보가 누락되었습니다.');

    // DB 저장용 ISO 문자열 생성
    const startISO = `${formData.date}T${formData.startTime}:00`;
    const endISO = `${formData.date}T${formData.endTime}:00`;

    // 2. [중복 체크] 현재 날짜의 해당 홀 예약 전체를 가져옴
    const { data: existing } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('hall_id', parseInt(hallId))
      .gte('start_time', `${formData.date}T00:00:00`)
      .lte('start_time', `${formData.date}T23:59:59`);

    // 3. 실제 시간(Millisecond)으로 변환하여 겹침 계산
    const newStart = new Date(startISO).getTime();
    const newEnd = new Date(endISO).getTime();

    const isOverlapping = existing?.some(b => {
      const exStart = new Date(b.start_time).getTime();
      const exEnd = new Date(b.end_time).getTime();
      
      // 공식: (새 시작 < 기존 종료) AND (새 종료 > 기존 시작)
      return (newStart < exEnd && newEnd > exStart);
    });

    if (isOverlapping) {
      alert('⚠️ 이미 다른 예약이 잡혀 있는 시간대입니다.');
      return;
    }

    // 4. 저장 진행
    const { error } = await supabase.from('bookings').insert([{
      hall_id: parseInt(hallId),
      user_name: formData.userName,
      user_phone: formData.userPhone,
      purpose: formData.purpose,
      start_time: startISO,
      end_time: endISO,
    }]);

    if (!error) {
      alert(`${hallName} 예약이 확정되었습니다.`);
      router.push('/');
      router.refresh();
    } else {
      alert('저장 에러: ' + error.message);
    }
  };

  return (
    <main className="min-h-screen bg-white p-6">
      {/* UI 부분은 이전과 동일하게 유지 */}
      <button onClick={() => router.push('/')} className="mb-6 flex items-center gap-2 text-slate-500 font-bold underline">
        <ArrowLeft size={20} /> 현황판으로 돌아가기
      </button>

      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 leading-tight">
          <span className="text-blue-600">{hallName}</span><br />예약 신청
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <input required type="text" placeholder="예약자 성함" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all" 
            onChange={e => setFormData({...formData, userName: e.target.value})} />
          
          <input required type="tel" placeholder="연락처" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all" 
            onChange={e => setFormData({...formData, userPhone: e.target.value})} />
          
          <input required type="text" placeholder="사용 목적 (예: 찬양팀 연습)" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all" 
            onChange={e => setFormData({...formData, purpose: e.target.value})} />
        </div>

        <div className="p-6 bg-slate-900 rounded-[2rem] text-white space-y-4 shadow-xl">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-400 ml-1">날짜</span>
            <input required type="date" value={formData.date} className="bg-transparent text-xl font-black outline-none w-full" 
              onChange={e => setFormData({...formData, date: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-6 pt-2">
            <div className="flex flex-col gap-1 border-t border-slate-700 pt-4">
              <span className="text-xs font-bold text-slate-400 ml-1">시작 시간</span>
              <input required type="time" className="bg-transparent text-xl font-black outline-none" 
                onChange={e => setFormData({...formData, startTime: e.target.value})} />
            </div>
            <div className="flex flex-col gap-1 border-t border-slate-700 pt-4">
              <span className="text-xs font-bold text-slate-400 ml-1">마침 시간</span>
              <input required type="time" className="bg-transparent text-xl font-black outline-none" 
                onChange={e => setFormData({...formData, endTime: e.target.value})} />
            </div>
          </div>
        </div>

        <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xl shadow-lg active:scale-95 transition-all mt-4">
          예약 완료하기
        </button>
      </form>
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