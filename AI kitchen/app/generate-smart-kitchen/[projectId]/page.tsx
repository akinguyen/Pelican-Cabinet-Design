import { SimpleGenerateSmartKitchenScreen } from '../../../src/features/generate-smart-kitchen/screens/SimpleGenerateSmartKitchenScreen';

export interface GenerateSmartKitchenProjectPageProps {
  readonly params: {
    readonly projectId: string;
  };
}

export default function GenerateSmartKitchenProjectPage({ params }: GenerateSmartKitchenProjectPageProps) {
  return <SimpleGenerateSmartKitchenScreen projectId={params.projectId} />;
}
