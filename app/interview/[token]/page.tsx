import InterviewV2 from '@/components/interview-v2';
export default async function InterviewPage({params}:{params:Promise<{token:string}>}) {
  const {token}=await params;
  return <InterviewV2 token={token}/>;
}
