import ProfileModal from "./ProfileModal";

const MODAL_COMPONENTS={
    profile: ProfileModal,
};

export default function ModalManager({ activeModal, onClose }) {
    const ModalComponent=MODAL_COMPONENTS[activeModal];
    if(!ModalComponent){return null;}
    return <ModalComponent isOpen={!!activeModal} onClose={onClose} />;
}