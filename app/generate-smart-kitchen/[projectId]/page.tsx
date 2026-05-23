import { SimpleGenerateSmartKitchenScreen } from '../../../src/features/generate-smart-kitchen/screens/SimpleGenerateSmartKitchenScreen';

export interface GenerateSmartKitchenProjectPageProps {
  readonly params: {
    readonly projectId: string;
  };
}

export default async function GenerateSmartKitchenProjectPage({
  params,
}: {
  readonly params: Promise<GenerateSmartKitchenProjectPageProps['params']>;
}) {
  const resolvedParams = await params;

  return <SimpleGenerateSmartKitchenScreen projectId={resolvedParams.projectId} />;
}
