export interface ConfirmationDialogData {
    title: string;
    body: string;
    onAgreed: () => void;
    onRefused?: () => void;
}
