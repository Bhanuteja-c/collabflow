import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import getCroppedImg from '@/lib/cropImage';
import { Loader2 } from 'lucide-react';

interface ImageCropperModalProps {
    isOpen: boolean;
    imageSrc: string | null;
    onClose: () => void;
    onCropCompleteAction: (croppedFile: File) => Promise<void>;
}

export function ImageCropperModal({ isOpen, imageSrc, onClose, onCropCompleteAction }: ImageCropperModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixelsObj: any) => {
        setCroppedAreaPixels(croppedAreaPixelsObj);
    }, []);

    const handleSave = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        setIsSaving(true);
        try {
            const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels, 0);
            if (croppedFile) {
                await onCropCompleteAction(croppedFile);
                onClose();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Adjust Avatar</DialogTitle>
                </DialogHeader>
                <div className="relative w-full h-64 sm:h-80 bg-black/10 rounded-lg overflow-hidden my-2">
                    {imageSrc && (
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1} // 1:1 circle aspect ratio
                            cropShape="round"
                            showGrid={false}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                        />
                    )}
                </div>
                <div className="flex flex-col gap-2 w-full mt-2">
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full accent-primary"
                    />
                </div>
                <DialogFooter className="mt-2">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        {isSaving ? "Saving..." : "Save Image"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
