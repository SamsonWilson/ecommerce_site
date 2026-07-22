from django.db import migrations, models


def to_channel(apps, schema_editor):
    """is_wholesale_only=True  ->  vente en gros uniquement."""
    Product = apps.get_model("catalog", "Product")
    Product.objects.filter(is_wholesale_only=True).update(sales_channel="WHOLESALE")


def to_boolean(apps, schema_editor):
    Product = apps.get_model("catalog", "Product")
    Product.objects.filter(sales_channel="WHOLESALE").update(is_wholesale_only=True)


class Migration(migrations.Migration):
    dependencies = [("catalog", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="product",
            name="sales_channel",
            field=models.CharField(
                default="BOTH", max_length=10,
                choices=[("BOTH", "Détail et gros"), ("RETAIL", "Détail uniquement"),
                         ("WHOLESALE", "Gros uniquement")],
                help_text="Détermine qui voit ce produit : clients au détail, grossistes validés, ou les deux.",
            ),
        ),
        migrations.RunPython(to_channel, to_boolean),
        migrations.RemoveField(model_name="product", name="is_wholesale_only"),
    ]
