import Gtk from "gi://Gtk?version=4.0";
import GObject from "gi://GObject";
import GLib from "gi://GLib";

import { load_thumbnails } from "../webimage.js";
import { MuzikaPlayer } from "src/player";
import { SignalListeners } from "src/util/signal-listener.js";
import { get_player } from "src/application.js";
import { FixedRatioThumbnail } from "../fixed-ratio-thumbnail.js";

export interface MiniPlayerViewOptions {
  player: MuzikaPlayer;
}

GObject.type_ensure(FixedRatioThumbnail.$gtype);

export class PlayerPreview extends Gtk.Stack {
  static {
    GObject.registerClass({
      GTypeName: "PlayerPreview",
      Template:
        "resource:///com/vixalien/muzika/ui/components/player/preview.ui",
      InternalChildren: [
        "image",
        "picture",
      ],
      Properties: {
        size: GObject.ParamSpec.int(
          "size",
          "Size",
          "Size",
          GObject.ParamFlags.READWRITE,
          0,
          GLib.MAXINT32,
          0,
        ),
      },
      Signals: {
        activate: {},
      },
    }, this);
  }

  private _image!: Gtk.Image;
  private _picture!: FixedRatioThumbnail;

  get size(): number {
    return this._image.pixel_size;
  }

  set size(size: number) {
    this._image.pixel_size =
      this._picture.min_height =
      this._picture.max_height =
      this._picture.min_width =
        size;
  }

  private listeners = new SignalListeners();

  setup_player() {
    const player = get_player();

    this.listeners.add_binding(player.bind_property(
      "paintable",
      this._picture,
      "paintable",
      GObject.BindingFlags.SYNC_CREATE,
    ));

    this.listeners.connect(
      player.queue,
      "notify::current",
      this.song_changed.bind(this),
    );

    this.song_changed();
  }

  teardown_player() {
    this.listeners.clear();
    this._picture.paintable = null!;
  }

  /**
   * loading multiple thumbnails can result in the previous one loading
   * after the current one, so we need to abort the previous one
   */
  abort_thumbnail: AbortController | null = null;

  song_changed() {
    const player = get_player();

    const song = player.queue.current?.object;

    if (!song) return;

    if (this.abort_thumbnail != null) {
      this.abort_thumbnail.abort();
      this.abort_thumbnail = null;
    }

    // thumbnail

    if (player.queue.current_is_video) {
      this.visible_child = this._picture;
    } else {
      this.visible_child = this._image;

      this._image.icon_name = "image-missing-symbolic";

      this.abort_thumbnail = new AbortController();

      load_thumbnails(this._image, song.thumbnails, {
        width: this.size,
        signal: this.abort_thumbnail.signal,
      });
    }
  }

  vfunc_map(): void {
    super.vfunc_map();
    this.setup_player();
  }

  vfunc_unmap(): void {
    this.teardown_player();
    super.vfunc_unmap();
  }
}
